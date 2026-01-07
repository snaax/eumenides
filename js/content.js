// Eumenides - Content Script
// Intercepte les boutons "Poster" sur les réseaux sociaux

(function() {
  'use strict';

  // Helper to safely get i18n messages (handles extension context invalidation)
  function safeGetMessage(key, fallback) {
    try {
      if (chrome && chrome.i18n) {
        return chrome.i18n.getMessage(key) || fallback;
      }
    } catch (e) {
      console.warn('Extension context invalidated, using fallback message');
    }
    return fallback;
  }

  // Helper to safely use chrome.storage (handles extension context invalidation)
  function safeStorageSet(data, callback) {
    try {
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set(data, callback);
      }
    } catch (e) {
      console.warn('Extension context invalidated, cannot save to storage');
    }
  }

  function safeStorageGet(keys, callback) {
    try {
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(keys, callback);
      }
    } catch (e) {
      console.warn('Extension context invalidated, cannot read from storage');
      callback({});
    }
  }

  function safeLocalStorageSet(data, callback) {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(data, callback);
      }
    } catch (e) {
      console.warn('Extension context invalidated, cannot save to local storage');
    }
  }

  function safeLocalStorageGet(keys, callback) {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(keys, callback);
      }
    } catch (e) {
      console.warn('Extension context invalidated, cannot read from local storage');
      callback({});
    }
  }

  let isEnabled = true;
  let currentMode = 'instant';
  let dailyLimit = 5;
  let postsToday = 0;
  let isPremium = false;
  
  safeStorageGet(['enabled', 'mode', 'postsToday', 'premium'], (data) => {
    isEnabled = data.enabled !== false;
    currentMode = data.mode || 'instant';
    postsToday = data.postsToday || 0;
    isPremium = data.premium || false;

    if (isEnabled) {
      initInterception();
    }
  });
  
  function getPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('facebook.com')) return 'facebook';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('reddit.com')) return 'reddit';
    return 'unknown';
  }
  
  const buttonSelectors = {
    twitter: [
      '[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'button[data-testid="tweetButton"]',
      '[data-testid="sendButton"]',
      'div[role="button"][data-testid*="tweet"]'
    ],
    facebook: [
      '[aria-label="Publier"]',
      'div[aria-label="Post"]',
      'button[type="submit"][value="Post"]',
      '[aria-label="Post"]',
      'div[aria-label="Envoyer"]'
    ],
    linkedin: [
      'button.share-actions__primary-action',
      'button[aria-label="Post"]',
      '.share-box-footer__main-btn',
      'button.share-actions__share-button',
      'button[class*="share-box-footer"]'
    ],
    reddit: [
      'shreddit-async-loader button[type="submit"]',
      'button[slot="submit"]',
      'button[type="submit"]',
      '.AnimatedForm__submitButton'
    ]
  };
  
  function initInterception() {
    const platform = getPlatform();
    const selectors = buttonSelectors[platform];
    
    if (!selectors) {
      console.log('Eumenides: Plateforme non supportée');
      return;
    }
    
    const observer = new MutationObserver(() => {
      interceptButtons(selectors);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    interceptButtons(selectors);
  }
  
  function interceptButtons(selectors) {
    selectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        if (!button.dataset.eumenidesIntercepted) {
          button.dataset.eumenidesIntercepted = 'true';
          interceptButton(button);
        }
      });
    });
  }
  
  function interceptButton(button) {
    button.addEventListener('click', function(e) {
      if (!isEnabled) return;
      
      if (!isPremium && postsToday >= dailyLimit) {
        e.preventDefault();
        e.stopPropagation();
        showLimitReached();
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const postContent = getPostContent();

      postsToday++;
      safeStorageSet({ postsToday });

      switch(currentMode) {
        case 'instant':
          handleInstantMode(button, postContent);
          break;
        case 'preview':
          handlePreviewMode(button, postContent);
          break;
        case 'delay':
          if (isPremium) {
            handleDelayMode(button, postContent);
          } else {
            showPremiumRequired();
          }
          break;
      }
      
      saveToHistory(postContent);
    }, true);
  }
  
  function getPostContent() {
    const platform = getPlatform();
    let content = '';

    switch(platform) {
      case 'twitter':
        const twitterSelectors = [
          '[data-testid="tweetTextarea_0"]',
          '.DraftEditor-editorContainer',
          '[contenteditable="true"][aria-label*="Tweet"]',
          '[data-testid="dmComposerTextInput"]'
        ];
        for (const selector of twitterSelectors) {
          const input = document.querySelector(selector);
          if (input) {
            content = input.textContent || input.innerText || '';
            if (content.trim()) break;
          }
        }
        break;
      case 'facebook':
        const fbSelectors = [
          '[contenteditable="true"][role="textbox"]',
          'div[aria-label*="Write a comment"]',
          'div[contenteditable="true"][data-contents="true"]'
        ];
        for (const selector of fbSelectors) {
          const input = document.querySelector(selector);
          if (input) {
            content = input.textContent || input.innerText || '';
            if (content.trim()) break;
          }
        }
        break;
      case 'linkedin':
        const liSelectors = [
          '.ql-editor',
          'div[contenteditable="true"][role="textbox"]',
          '.msg-form__contenteditable'
        ];
        for (const selector of liSelectors) {
          const input = document.querySelector(selector);
          if (input) {
            content = input.textContent || input.innerText || '';
            if (content.trim()) break;
          }
        }
        break;
      case 'reddit':
        // Try textarea first (old Reddit)
        let redditTextarea = document.querySelector('textarea[name="text"]') ||
                            document.querySelector('textarea[placeholder*="Comment"]') ||
                            document.querySelector('textarea[placeholder*="comment"]');

        if (redditTextarea && redditTextarea.value) {
          content = redditTextarea.value;
        } else {
          // New Reddit - look for contenteditable
          const redditEditor = document.querySelector('[contenteditable="true"][role="textbox"]') ||
                              document.querySelector('[contenteditable="true"].public-DraftEditor-content') ||
                              document.querySelector('div[contenteditable="true"]');

          if (redditEditor) {
            // Get only the visible text, not the internal structure
            content = redditEditor.innerText || redditEditor.textContent || '';
          }
        }
        break;
    }

    return content.trim();
  }
  
  function handleInstantMode(button, content) {
    button.disabled = true;
    button.style.opacity = '0.5';

    const originalText = button.textContent;
    const originalHTML = button.innerHTML;

    // Show sending state
    if (button.textContent) {
      button.textContent = safeGetMessage('postSending', 'Sending...');
    }

    setTimeout(() => {
      // Clear the post content
      clearPostContent();

      // Try to inject the fake post into the page
      const injected = injectFakePost(content);

      // Show notification
      showPostInterceptedNotification();

      // Restore button
      button.textContent = originalText;
      button.innerHTML = originalHTML;
      button.disabled = false;
      button.style.opacity = '1';

      // If we couldn't inject, reload the page as fallback
      if (!injected) {
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    }, 1200);
  }

  function injectFakePost(content, isPreview = false) {
    const platform = getPlatform();

    try {
      switch(platform) {
        case 'reddit':
          return injectRedditComment(content, isPreview);
        case 'twitter':
          return injectTweet(content, isPreview);
        case 'facebook':
          return injectFacebookPost(content, isPreview);
        case 'linkedin':
          return injectLinkedInPost(content, isPreview);
        default:
          return false;
      }
    } catch (e) {
      console.error('Failed to inject fake post:', e);
      return false;
    }
  }

  function injectRedditComment(content, isPreview = false) {
    // Find the comment thread container
    const commentThread = document.querySelector('shreddit-comment-tree') ||
                         document.querySelector('.commentarea') ||
                         document.querySelector('[slot="comment-tree"]');

    if (!commentThread) return false;

    // Create a fake comment element that matches Reddit's style
    let fakeComment;

    if (isPreview) {
      // Preview mode: looks like a real comment, stays permanently
      // Try to clone an existing comment's structure and CSS
      const existingComment = document.querySelector('shreddit-comment');

      if (existingComment) {
        // Clone the structure of a real comment
        fakeComment = existingComment.cloneNode(true);

        // Find and update the author name
        const authorElement = fakeComment.querySelector('[slot="author"]') ||
                             fakeComment.querySelector('[author]');
        if (authorElement) {
          authorElement.textContent = 'You';
        }

        // Find and update the comment body
        const bodyElement = fakeComment.querySelector('[slot="comment"]') ||
                           fakeComment.querySelector('p') ||
                           fakeComment.querySelector('div[class*="md"]');
        if (bodyElement) {
          bodyElement.innerHTML = content.replace(/\n/g, '<br>');
        }

        // Find and update timestamp
        const timeElement = fakeComment.querySelector('time') ||
                           fakeComment.querySelector('[slot="created-timestamp"]');
        if (timeElement) {
          timeElement.textContent = 'just now';
        }
      } else {
        // Fallback: use simple styling that inherits Reddit's CSS
        fakeComment = document.createElement('div');
        fakeComment.innerHTML = `
          <div style="animation: fadeIn 0.5s ease-in;">
            <div>
              <span style="font-weight: 700;">You</span>
              <span style="margin-left: 8px; opacity: 0.7;">just now</span>
            </div>
            <div style="margin-top: 8px;">
              ${content.replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }
      // No auto-removal for preview mode - stays until page refresh
    } else {
      // Instant mode: green highlight, "INTERCEPTED" badge, auto-removes
      fakeComment = document.createElement('div');
      fakeComment.style.cssText = `
        background: rgba(74, 222, 128, 0.15);
        border: 2px solid #4ade80;
        border-radius: 8px;
        padding: 16px;
        margin: 10px 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: fadeIn 0.5s ease-in;
      `;

      fakeComment.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-weight: 700; color: #d7dadc; font-size: 12px;">You</span>
          <span style="color: #b8babb; font-size: 12px;">just now</span>
          <span style="background: #4ade80; color: #000; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">✓ INTERCEPTED</span>
        </div>
        <div style="color: #e8eaed; line-height: 1.6; font-size: 14px;">
          ${content.replace(/\n/g, '<br>')}
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: #a8b5a8; font-style: italic; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
          This comment was intercepted by Eumenides and not actually posted.
        </div>
      `;

      // Remove after 5 seconds with fade out (instant mode only)
      setTimeout(() => {
        fakeComment.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => fakeComment.remove(), 500);
      }, 5000);
    }

    // Add animations if not already added
    if (!document.getElementById('eumenides-animations')) {
      const style = document.createElement('style');
      style.id = 'eumenides-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Insert at the top of comments
    commentThread.insertBefore(fakeComment, commentThread.firstChild);

    return true;
  }

  function injectTweet(content, isPreview = false) {
    // Find the timeline
    const timeline = document.querySelector('[data-testid="primaryColumn"]') ||
                    document.querySelector('main[role="main"]');

    if (!timeline) return false;

    let fakeTweet;

    if (isPreview) {
      // Preview mode: looks like a real tweet, stays permanently
      // Try to clone an existing tweet's structure
      const existingTweet = document.querySelector('article[data-testid="tweet"]');

      if (existingTweet) {
        // Clone the structure of a real tweet
        fakeTweet = existingTweet.cloneNode(true);

        // Find and update the tweet text
        const tweetText = fakeTweet.querySelector('[data-testid="tweetText"]') ||
                         fakeTweet.querySelector('[lang]');
        if (tweetText) {
          tweetText.innerHTML = content.replace(/\n/g, '<br>');
        }

        // Find and update timestamp
        const timeElement = fakeTweet.querySelector('time');
        if (timeElement) {
          timeElement.textContent = 'now';
          timeElement.setAttribute('datetime', new Date().toISOString());
        }
      } else {
        // Fallback: use simple styling that inherits Twitter's CSS
        fakeTweet = document.createElement('div');
        fakeTweet.innerHTML = `
          <div style="animation: fadeIn 0.5s ease-in;">
            <div>
              <span style="font-weight: 700;">You</span>
              <span style="margin-left: 8px; opacity: 0.7;">now</span>
            </div>
            <div style="margin-top: 8px;">
              ${content.replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }
      // No auto-removal for preview mode - stays until page refresh
    } else {
      // Instant mode: green highlight, "INTERCEPTED" badge, auto-removes
      fakeTweet = document.createElement('div');
      fakeTweet.style.cssText = `
        background: rgba(74, 222, 128, 0.15);
        border: 2px solid #4ade80;
        padding: 16px;
        margin: 16px;
        border-radius: 16px;
        animation: fadeIn 0.5s ease-in;
      `;

      fakeTweet.innerHTML = `
        <div style="display: flex; gap: 12px;">
          <div style="width: 48px; height: 48px; background: #4ade80; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: #000;">
            ✓
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; margin-bottom: 8px; color: #e7e9ea;">
              You <span style="background: #4ade80; color: #000; padding: 3px 10px; border-radius: 4px; font-size: 11px; margin-left: 8px; font-weight: 700;">INTERCEPTED</span>
            </div>
            <div style="color: #e7e9ea; font-size: 15px; margin-bottom: 12px; line-height: 1.5;">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <div style="font-size: 13px; color: #b8babb; font-style: italic; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
              This tweet was intercepted by Eumenides and not actually posted.
            </div>
          </div>
        </div>
      `;

      // Remove after 5 seconds with fade out (instant mode only)
      setTimeout(() => {
        fakeTweet.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => fakeTweet.remove(), 500);
      }, 5000);
    }

    timeline.insertBefore(fakeTweet, timeline.firstChild);

    return true;
  }

  function injectFacebookPost(content, isPreview = false) {
    // Fallback to reload for now
    return false;
  }

  function injectLinkedInPost(content, isPreview = false) {
    // Fallback to reload for now
    return false;
  }
  
  function handlePreviewMode(button, content) {
    button.disabled = true;
    button.style.opacity = '0.5';

    const originalText = button.textContent;
    const originalHTML = button.innerHTML;

    // Show sending state
    if (button.textContent) {
      button.textContent = safeGetMessage('postSending', 'Sending...');
    }

    setTimeout(() => {
      // Clear the post content
      clearPostContent();

      // Inject the fake post (permanent, looks real)
      injectFakePost(content, true); // true = preview mode (permanent, realistic)

      // Restore button
      button.textContent = originalText;
      button.innerHTML = originalHTML;
      button.disabled = false;
      button.style.opacity = '1';

      // Show notification
      showPostInterceptedNotification();
    }, 1200);
  }

  function handleDelayMode(content) {
    const timestamp = Date.now();
    const notifyAt = timestamp + (6 * 60 * 60 * 1000); // 6 hours from now

    const post = {
      content,
      platform: getPlatform(),
      timestamp,
      notifyAt
    };

    safeLocalStorageGet(['delayedPosts'], (data) => {
      const posts = data.delayedPosts || [];
      posts.push(post);
      safeLocalStorageSet({ delayedPosts: posts });

      // Schedule the notification alarm
      try {
        chrome.runtime.sendMessage({
          action: 'scheduleDelayedPost',
          post: post
        });
      } catch (e) {
        console.warn('Could not schedule delayed post alarm:', e);
      }
    });

    clearPostContent();
    showPostInterceptedNotification();
  }
  
  function clearPostContent() {
    const platform = getPlatform();
    
    switch(platform) {
      case 'twitter':
        const twitterInput = document.querySelector('[data-testid="tweetTextarea_0"]');
        if (twitterInput) twitterInput.textContent = '';
        break;
      case 'facebook':
        const fbInput = document.querySelector('[contenteditable="true"][role="textbox"]');
        if (fbInput) fbInput.textContent = '';
        break;
      case 'linkedin':
        const liInput = document.querySelector('.ql-editor');
        if (liInput) liInput.textContent = '';
        break;
      case 'reddit':
        const redditTextarea = document.querySelector('textarea[name="text"]') ||
                              document.querySelector('textarea[placeholder*="Comment"]') ||
                              document.querySelector('textarea[placeholder*="comment"]');
        if (redditTextarea) {
          redditTextarea.value = '';
        } else {
          const redditEditor = document.querySelector('[contenteditable="true"][role="textbox"]') ||
                              document.querySelector('[contenteditable="true"].public-DraftEditor-content');
          if (redditEditor) {
            redditEditor.innerHTML = '';
            redditEditor.textContent = '';
          }
        }
        break;
    }
  }
  
  function createPreviewOverlay(content) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
    `;
    
    const previewBox = document.createElement('div');
    previewBox.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 16px;
      max-width: 600px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    previewBox.innerHTML = `
      <h2 style="margin-bottom: 20px; color: #333;">${safeGetMessage('previewTitle', 'Preview')}</h2>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 12px; margin-bottom: 20px; color: #333; line-height: 1.6;">
        ${content || '<em>' + safeGetMessage('noContent', 'No content') + '</em>'}
      </div>
      <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
        ${safeGetMessage('previewNote', 'This post will not be published')}
      </p>
      <button id="closePreview" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
      ">${safeGetMessage('close', 'Close')}</button>
    `;
    
    overlay.appendChild(previewBox);
    
    setTimeout(() => {
      document.getElementById('closePreview')?.addEventListener('click', () => {
        overlay.remove();
        clearPostContent();
      });
    }, 100);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        clearPostContent();
      }
    });
    
    return overlay;
  }
  
  function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
      z-index: 999999;
      font-weight: 600;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function showPostInterceptedNotification() {
    // Remove any existing notification
    const existing = document.getElementById('eumenides-intercept-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'eumenides-intercept-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.5);
      z-index: 999999;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: 700; font-size: 18px; margin-bottom: 8px;">
        ${safeGetMessage('postIntercepted', 'Post intercepted!')}
      </div>
      <div style="font-size: 14px; margin-bottom: 16px; opacity: 0.95;">
        ${safeGetMessage('postInterceptedMessage', 'Your post was intercepted and kept safe.')}
      </div>
      <button id="eumenides-dismiss" style="
        width: 100%;
        background: white;
        border: none;
        color: #667eea;
        padding: 12px 16px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        cursor: pointer;
        transition: 0.2s;
        white-space: nowrap;
        text-align: center;
        line-height: normal;
        display: flex;
        align-items: center;
        justify-content: center;
      ">${safeGetMessage('close', 'Close')}</button>
    `;

    document.body.appendChild(notification);

    // Handle dismiss button
    const dismissBtn = document.getElementById('eumenides-dismiss');
    dismissBtn.addEventListener('click', () => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  function restorePostContent(content) {
    const platform = getPlatform();

    switch(platform) {
      case 'twitter':
        const twitterEditor = document.querySelector('[data-testid="tweetTextarea_0"]') ||
                             document.querySelector('[contenteditable="true"]');
        if (twitterEditor) {
          twitterEditor.textContent = content;
          twitterEditor.focus();
        }
        break;

      case 'reddit':
        const redditTextarea = document.querySelector('textarea[name="text"]');
        if (redditTextarea) {
          redditTextarea.value = content;
        } else {
          const redditEditor = document.querySelector('[contenteditable="true"][role="textbox"]');
          if (redditEditor) {
            redditEditor.textContent = content;
            redditEditor.focus();
          }
        }
        break;

      case 'facebook':
        const fbEditor = document.querySelector('[contenteditable="true"][role="textbox"]');
        if (fbEditor) {
          fbEditor.textContent = content;
          fbEditor.focus();
        }
        break;

      case 'linkedin':
        const liEditor = document.querySelector('[contenteditable="true"]');
        if (liEditor) {
          liEditor.textContent = content;
          liEditor.focus();
        }
        break;
    }
  }

  function showLimitReached() {
    showSuccessNotification(safeGetMessage('limitReached', 'Daily limit reached'));
  }

  function showPremiumRequired() {
    showSuccessNotification(safeGetMessage('premiumRequired', 'Premium required'));
  }
  
  function calculateTimeSaved(content) {
    // Calculate time saved based on content length
    const charCount = content.length;
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    // For very short posts (< 10 chars), minimal time saved
    if (charCount < 10) {
      return 1; // Just the typing + quick thought
    }

    // Time components (in minutes):
    // 1. Typing time: ~200 chars/min (40 WPM * 5 chars/word)
    const typingTime = charCount / 200;

    // 2. Reflection/thinking time before writing scales with post length
    // Short posts: 1-2 min, Medium: 2-3 min, Long: 3-5 min
    const reflectionTime = Math.min(1 + (wordCount / 30), 5);

    // 3. Re-reading and editing time scales with length
    const editingTime = Math.min(0.5 + (wordCount / 50), 2);

    // Total time saved (typing + thinking + editing)
    // No debate time since: intercepted = no debate, posted = debate happens anyway
    const total = typingTime + reflectionTime + editingTime;

    // Minimum 1 minute, maximum 10 minutes
    return Math.max(1, Math.min(total, 10));
  }

  function saveToHistory(content) {
    const entry = {
      content,
      platform: getPlatform(),
      timestamp: Date.now(),
      emotion: detectEmotion(content),
      timeSaved: calculateTimeSaved(content)
    };

    safeLocalStorageGet(['history'], (data) => {
      const history = data.history || [];
      history.unshift(entry);
      if (history.length > 100) history.pop();
      safeLocalStorageSet({ history });
    });

    // Submit stats to backend for premium users
    submitStatsToBackend(entry);
  }

  function submitStatsToBackend(entry) {
    // Only submit for premium users
    safeStorageGet(['premium', 'premiumEmail'], async (data) => {
      if (!data.premium || !data.premiumEmail) {
        return; // Skip for free users
      }

      const API_BASE_URL = 'https://eumenides-git-preview-snaxs-projects-47698530.vercel.app';

      // Determine hour range
      const hour = new Date().getHours();
      let hourRange = '00-05';
      if (hour >= 6 && hour <= 11) hourRange = '06-11';
      else if (hour >= 12 && hour <= 17) hourRange = '12-17';
      else if (hour >= 18 && hour <= 23) hourRange = '18-23';

      const stats = {
        postsIntercepted: 1,
        timeSavedMinutes: entry.timeSaved || 3,
        emotions: {
          [entry.emotion]: 1
        },
        platforms: {
          [entry.platform]: 1
        },
        hourlyPattern: {
          [hourRange]: 1
        }
      };

      try {
        await fetch(`${API_BASE_URL}/api/submit-stats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.premiumEmail,
            stats: stats
          })
        });
      } catch (error) {
        console.error('Failed to submit stats:', error);
        // Silent fail - don't interrupt user experience
      }
    });
  }
  
  function detectEmotion(text) {
    const angerWords = [
      // French anger words (80)
      'incompétent', 'ridicule', 'stupide', 'aberrant', 'nul', 'débile',
      'connard', 'connasse', 'idiot', 'idiote', 'imbécile', 'crétin',
      'minable', 'pathétique', 'merde', 'putain', 'bordel', 'con',
      'conne', 'pourri', 'foutu', 'dégueulasse', 'dégoûtant', 'horrible',
      'insupportable', 'inacceptable', 'scandaleux', 'honteux', 'lamentable', 'pitoyable',
      'catastrophique', 'désastreux', 'déplorable', 'méprisable', 'odieux', 'exécrable',
      'médiocre', 'navrant', 'affligeant', 'consternant', 'révoltant', 'choquant',
      'salaud', 'salope', 'emmerdant', 'chiant', 'chiante', 'démentiel',
      'délirant', 'aberration', 'nullité', 'incompréhensible', 'injuste', 'injustifiable',
      'indéfendable', 'hors-de-question', 'intolérable', 'inadmissible', 'ignoble', 'infâme',
      'répugnant', 'abject', 'vil', 'sordide', 'immonde', 'infecte',
      'hideux', 'monstrueux', 'dingue', 'taré', 'malade', 'tordu',
      'vicieux', 'malveillant', 'toxique', 'nocif', 'néfaste', 'pervers',

      // English anger words (80+)
      'incompetent', 'ridiculous', 'stupid', 'absurd', 'pathetic', 'idiot',
      'moron', 'dumb', 'idiotic', 'moronic', 'foolish', 'ignorant',
      'terrible', 'awful', 'horrible', 'disgusting', 'shit', 'damn',
      'fuck', 'fucking', 'crap', 'bullshit', 'trash', 'garbage',
      'worthless', 'useless', 'pointless', 'hopeless', 'lousy', 'lame',
      'appalling', 'atrocious', 'dreadful', 'abysmal', 'deplorable', 'shameful',
      'disgraceful', 'outrageous', 'scandalous', 'unacceptable', 'insufferable', 'intolerable',
      'despicable', 'vile', 'wretched', 'miserable', 'pitiful', 'laughable',
      'ludicrous', 'preposterous', 'asinine', 'inane', 'senseless', 'mindless',
      'brainless', 'thoughtless', 'reckless', 'careless', 'negligent', 'incomprehensible',
      'unjust', 'unfair', 'unbelievable', 'incredible', 'insane', 'crazy',
      'nuts', 'mad', 'obnoxious', 'repulsive', 'revolting', 'sickening',
      'nauseating', 'vomit', 'bastard', 'asshole', 'jerk', 'prick',
      'dick', 'douchebag', 'scumbag', 'lowlife', 'loser', 'failure',
      'joke', 'clown', 'toxic', 'harmful', 'malicious', 'vicious'
    ];

    const frustrationWords = [
      // French frustration words
      'sérieusement', 'comment', 'encore', 'toujours', 'franchement', 'vraiment',
      'frustrant', 'énervant', 'agaçant', 'irritant', 'pénible', 'insensé',
      'absurde', 'grotesque', 'risible',

      // English frustration words
      'seriously', 'how', 'again', 'always', 'honestly', 'really',
      'annoying', 'irritating', 'frustrating', 'infuriating', 'maddening', 'aggravating',
      'offensive', 'insulting', 'contemptible'
    ];

    const lowerText = text.toLowerCase();

    if (angerWords.some(word => lowerText.includes(word))) {
      return 'anger';
    }
    if (frustrationWords.some(word => lowerText.includes(word))) {
      return 'frustration';
    }
    return 'irritation';
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleEnabled') {
      isEnabled = request.enabled;
      console.log('Eumenides: Protection', isEnabled ? 'enabled' : 'disabled');
    }
    if (request.action === 'changeMode') {
      currentMode = request.mode;
      console.log('Eumenides: Mode changed to', currentMode);
    }
    if (request.action === 'fillContent') {
      // This is called when user clicks "Post now" on a delayed post notification
      restorePostContent(request.content);
      console.log('Eumenides: Filled delayed post content');
    }
  });

  // Also listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      if (changes.enabled) {
        isEnabled = changes.enabled.newValue;
        console.log('Eumenides: Protection', isEnabled ? 'enabled' : 'disabled');
      }
      if (changes.mode) {
        currentMode = changes.mode.newValue;
        console.log('Eumenides: Mode changed to', currentMode);
      }
      if (changes.postsToday) {
        postsToday = changes.postsToday.newValue;
      }
      if (changes.premium) {
        isPremium = changes.premium.newValue;
      }
    }
  });

})();