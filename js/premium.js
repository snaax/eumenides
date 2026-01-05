document.addEventListener('DOMContentLoaded', function() {
  const buyButtons = document.querySelectorAll('.buy-button');
  buyButtons.forEach(button => {
    button.addEventListener('click', function() {
      alert('Redirection vers le paiement sécurisé...\n\nNote: Cette démo ne traite pas de vrais paiements.');
    });
  });
});
