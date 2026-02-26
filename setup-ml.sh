#!/bin/bash
# Setup script for TensorFlow.js ML dependencies

echo "Setting up TensorFlow.js for Eumenides..."

# Create lib directory if it doesn't exist
mkdir -p js/lib

# Download TensorFlow.js core (CPU backend for extension)
echo "Downloading TensorFlow.js..."
curl -o js/lib/tf.min.js https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js

# Download TensorFlow.js toxicity model
echo "Downloading Toxicity model..."
curl -o js/lib/toxicity.min.js https://cdn.jsdelivr.net/npm/@tensorflow-models/toxicity@1.2.2/dist/toxicity.min.js

echo "✓ TensorFlow.js libraries downloaded successfully"
echo ""
echo "Note: The toxicity model files (~1MB) will be downloaded at runtime"
echo "from: https://tfhub.dev/tensorflow/tfjs-model/toxicity/1/default/1"
echo ""
echo "To use ML features:"
echo "1. Run this script to download libraries"
echo "2. Update manifest.json to include the libraries in content_scripts"
echo "3. Reload the extension"
