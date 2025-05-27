// Fonction pour mettre à jour les horodatages
function updateTimestamps() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const formattedTime = `22/04/2025 ${hours}:${minutes}:${seconds}`;

  document.getElementById('timestamp-video').textContent = formattedTime;
  document.getElementById('timestamp-ai').textContent = formattedTime;
}

// Fonction pour mettre à jour le chronomètre d'inspection
function updateInspectionTime() {
  let seconds = 0;
  setInterval(() => {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    document.getElementById('inspection-time').textContent = formattedTime;
  }, 1000);
}

// Fonction pour mettre à jour l'indicateur de type d'inspection
function updateInspectionTypeIndicator(type) {
  const detectionTitle = document.querySelector('.detections h2');
  if (detectionTitle) {
    detectionTitle.textContent = type === "VUE_DESSUS" ?
      "Résultats de l'Inspection IA (TOP)" :
      "Résultats de l'Inspection IA (BOT)";
  }
}

// Fonction pour basculer entre les panneaux
function switchToCardInfo() {
  // Masquer le panneau d'entrée manuelle
  const manualEntryPanel = document.getElementById('manual-entry-panel');
  if (manualEntryPanel) {
    manualEntryPanel.style.display = 'none';
  }

  // Afficher le panneau d'informations de carte
  const carteInfoPanel = document.getElementById('carte-info-panel');
  if (carteInfoPanel) {
    carteInfoPanel.style.display = 'block';
  }

  // Mettre à jour les informations de la carte avec les valeurs saisies
  const refValue = document.getElementById('manual-ref')?.value;
  const ofValue = document.getElementById('manual-of')?.value;

  if (document.getElementById('ci-ref')) {
    document.getElementById('ci-ref').textContent = refValue || "CA-2025-4873";
  }

  if (document.getElementById('ci-of')) {
    document.getElementById('ci-of').textContent = ofValue || "OF-9327";
  }
}

function captureTopImage() {
  const videoImage = document.getElementById('cameraStream');
  const aiOverlay = document.getElementById('aiOverlay');

  // Créer un canvas pour capturer l'image
  const canvas = document.createElement('canvas');
  canvas.width = videoImage.naturalWidth || videoImage.width;
  canvas.height = videoImage.naturalHeight || videoImage.height;

  // Dessiner l'image sur le canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoImage, 0, 0, canvas.width, canvas.height);

  // Convertir le canvas en base64
  const imageData = canvas.toDataURL('image/jpeg');

  // Afficher un indicateur de chargement
  aiOverlay.src = "/static/img/loading.gif";

  // Envoyer l'image au serveur pour analyse avec le modèle TOP
  fetch('/capture-top-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: imageData }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Image vue de dessus capturée avec succès:', data.filename);

      // Si une image résultat est disponible, l'afficher
      if (data.result_available) {
        // Ajouter un timestamp pour éviter la mise en cache du navigateur
        aiOverlay.src = `/get-top-result-image?t=${new Date().getTime()}`;

        // Mettre à jour le panneau des détections avec les résultats du modèle
        if (data.detections && Array.isArray(data.detections)) {
          updateDetectionResults(data.detections, "VUE_DESSUS");
        } else {
          // Si pas de détections dans la réponse
          const resultsContainer = document.getElementById('detections-list');
          resultsContainer.innerHTML = '<li id="no-defects" class="status-message">Aucun défaut détecté (vue de dessus)</li>';
        }

        // Mettre à jour le titre du panneau pour indiquer qu'il s'agit d'une vue de dessus
        updateInspectionTypeIndicator("VUE_DESSUS");
      } else {
        console.warn('Pas de résultat d\'analyse vue de dessus disponible');
        aiOverlay.src = "/static/img/placeholder.png";

        // Réinitialiser le panneau des détections
        const resultsContainer = document.getElementById('detections-list');
        resultsContainer.innerHTML = '<li id="no-defects" class="status-message">Aucun défaut détecté (vue de dessus)</li>';
      }
    } else {
      console.error('Erreur lors de la capture vue de dessus:', data.error);
      alert('Erreur lors de la capture vue de dessus: ' + data.error);
      aiOverlay.src = "/static/img/placeholder.png";
    }
  })
  .catch(error => {
    console.error('Erreur lors de l\'envoi de l\'image vue de dessus:', error);
    alert('Erreur lors de l\'envoi de l\'image vue de dessus');
    aiOverlay.src = "/static/img/placeholder.png";
  });
}

function captureImage() {
  const videoImage = document.getElementById('cameraStream');
  const aiOverlay = document.getElementById('aiOverlay');

  // Créer un canvas pour capturer l'image
  const canvas = document.createElement('canvas');
  canvas.width = videoImage.naturalWidth || videoImage.width;
  canvas.height = videoImage.naturalHeight || videoImage.height;

  // Dessiner l'image sur le canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoImage, 0, 0, canvas.width, canvas.height);

  // Convertir le canvas en base64
  const imageData = canvas.toDataURL('image/jpeg');

  // Afficher un indicateur de chargement
  aiOverlay.src = "/static/img/loading.gif";

  // Envoyer l'image au serveur
  fetch('/capture-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: imageData }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Image capturée avec succès:', data.filename);

      // Si une image résultat est disponible, l'afficher
      if (data.result_available) {
        // Ajouter un timestamp pour éviter la mise en cache du navigateur
        aiOverlay.src = `/get-result-image?t=${new Date().getTime()}`;

        // Mettre à jour le panneau des détections avec les résultats du modèle
        if (data.detections && Array.isArray(data.detections)) {
          updateDetectionResults(data.detections, "STANDARD");
        } else {
          // Si pas de détections dans la réponse, essayer de les récupérer séparément
          fetchInspectionDetails();
        }

        // Mettre à jour l'indication du type d'inspection
        updateInspectionTypeIndicator("STANDARD");
      } else {
        console.warn('Pas de résultat d\'analyse disponible');
        aiOverlay.src = "/static/img/placeholder.png";

        // Réinitialiser le panneau des détections
        const resultsContainer = document.getElementById('detections-list');
        resultsContainer.innerHTML = '<li id="no-defects" class="status-message">Aucun défaut détecté</li>';
      }
    } else {
      console.error('Erreur lors de la capture:', data.error);
      alert('Erreur lors de la capture: ' + data.error);
      aiOverlay.src = "/static/img/placeholder.png";
    }
  })
  .catch(error => {
    console.error('Erreur lors de l\'envoi de l\'image:', error);
    alert('Erreur lors de l\'envoi de l\'image');
    aiOverlay.src = "/static/img/placeholder.png";
  });
}

// Fonction pour récupérer et afficher les détails de la dernière inspection
function fetchInspectionDetails() {
  fetch('/get-last-inspection-details')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Mettre à jour la liste des résultats de détection
        updateDetectionResults(data.components);

        // Mettre à jour les informations de la carte
        if (document.getElementById('date-inspection')) {
          document.getElementById('date-inspection').textContent = data.date;
        }

        // Mettre à jour le statut de la carte à "Inspectée"
        const statusElement = document.querySelector('.carte-info p:nth-child(5) span');
        if (statusElement) {
          statusElement.textContent = "Inspectée";
          statusElement.classList.add('status-inspected');
        }
      } else {
        console.error('Erreur lors de la récupération des détails:', data.error);
      }
    })
    .catch(error => {
      console.error('Erreur lors de la récupération des détails d\'inspection:', error);
    });
}

// Fonction pour mettre à jour les résultats de détection
function updateDetectionResults(detections, inspectionType = "STANDARD") {
  const resultsContainer = document.getElementById('detections-list');

  // Vider la liste actuelle
  resultsContainer.innerHTML = '';

  // Si pas de détections, afficher le message par défaut
  if (!detections || detections.length === 0) {
    const li = document.createElement('li');
    li.id = 'no-defects';
    li.className = 'status-message';
    li.textContent = inspectionType === "VUE_DESSUS" ?
      'Aucun défaut détecté (vue de dessus)' :
      'Aucun défaut détecté';
    resultsContainer.appendChild(li);
    return;
  }

  // Ajouter les composants détectés à la liste avec un style différent selon le type d'inspection
  detections.forEach(detection => {
    const li = document.createElement('li');
    li.className = `detection-item ${inspectionType === "VUE_DESSUS" ? "detection-top" : "detection-standard"}`;

    // Récupérer le nom de classe et la confiance
    const className = detection.class || detection.name;
    const confidence = typeof detection.confidence === 'number'
      ? detection.confidence
      : 0;

    // Insérer uniquement le nom de classe et l'indicateur de confiance
    li.innerHTML = `
      <span class="detection-class">${className}</span>
      <span class="detection-confidence">${confidence.toFixed(2)}%</span>
    `;
    resultsContainer.appendChild(li);
  });
}

// Initialisation et mise à jour des éléments dynamiques
document.addEventListener('DOMContentLoaded', () => {

  // Mettre à jour les timestamps
  if (document.getElementById('timestamp-video')) {
    updateTimestamps();
    setInterval(updateTimestamps, 1000);
  }

  // Mettre à jour le chronomètre d'inspection
  if (document.getElementById('inspection-time')) {
    updateInspectionTime();
  }

  // Gestion du flux vidéo avec fallback vers snapshots
  const img = document.getElementById('cameraStream');
  if (img) {
    let isMjpegWorking = false;

    // Détecter si MJPEG fonctionne
    img.onload = () => isMjpegWorking = true;
    img.onerror = () => {
      if (!isMjpegWorking) {
        console.log("Le flux MJPEG n'est pas disponible, passage aux snapshots");
        // Basculer vers les snapshots
        setInterval(() => {
          img.src = "http://localhost:8080/shot.jpg?t=" + Date.now();
        }, 100);
      }
    };
  }
  const logoutButton = document.querySelector('.logout-button');

  // Vérifier si le bouton existe
  if (logoutButton) {
    // Ajouter un écouteur d'événement pour le clic sur le bouton
    logoutButton.addEventListener('click', function(event) {
      event.preventDefault();

      // Rediriger vers la route de déconnexion
      window.location.href = '/logout';

      // Vous pouvez aussi ajouter une animation ou un message avant la redirection
      logoutButton.disabled = true;
      logoutButton.innerHTML = 'Déconnexion en cours...';});
    }
  // Ajouter l'écouteur pour le bouton inspect-top
  const inspectTopButton = document.querySelector('button.inspect-top');
  if (inspectTopButton) {
    inspectTopButton.addEventListener('click', captureTopImage);
  }

  // Gestion du bouton d'inspection
  const inspectButton = document.querySelector('button.inspect');
  if (inspectButton) {
    inspectButton.addEventListener('click', captureImage);
  }

  // Gestion du bouton Vérifier
  const verifyButton = document.querySelector('button.verify');
  if (verifyButton) {
    verifyButton.addEventListener('click', function() {
      // Vérifier si les champs requis sont remplis
      const refInput = document.getElementById('manual-ref');
      const ofInput = document.getElementById('manual-of');

      if (refInput && ofInput) {
        if (refInput.value.trim() === '' || ofInput.value.trim() === '') {
          alert('Veuillez remplir tous les champs requis.');
          return;
        }

        // Tout est valide, basculer vers le panneau d'informations
        switchToCardInfo();
      }
    });
  }

  // Gestion du bouton Valider
  const validateButton = document.querySelector('button.validate');
  if (validateButton) {
    validateButton.addEventListener('click', function() {
      alert('Inspection validée avec succès!');
      // Ici vous pourriez ajouter du code pour enregistrer la validation dans la base de données
    });
  }

  // Gestion du bouton Réviser
  const reviewButton = document.querySelector('button.review');
  if (reviewButton) {
    reviewButton.addEventListener('click', function() {
      alert('Mode révision activé. Veuillez examiner les résultats.');
      // Ici vous pourriez ajouter du code pour entrer en mode révision
    });
  }
});
document.addEventListener('DOMContentLoaded', function() {
  // Get all workflow control buttons
  const verifyBtn = document.querySelector('.verify');
  const inspectBotBtn = document.querySelector('.inspect');
  const inspectTopBtn = document.querySelector('.inspect-top');
  const validateBtn = document.querySelector('.validate');
  const reviewBtn = document.querySelector('.review');

  // Get all steps
  const steps = document.querySelectorAll('.stepper .step');

  // Current step tracker (0-based initially, no active step at start)
  let currentStep = 0;

  // Function to mark a specific step as completed
  function completeStep(stepNumber) {
    if (stepNumber <= 0 || stepNumber > steps.length) return;

    // Update the specified step to be completed
    steps[stepNumber - 1].classList.add('completed');
    steps[stepNumber - 1].classList.remove('active', 'next');

    // If there's a next step, make it the active one
    if (stepNumber < steps.length) {
      steps[stepNumber].classList.add('next');
    }

    // Update progress line width
    updateProgressLine(stepNumber);
  }

  // Function to update the progress line width
  function updateProgressLine(completedSteps) {
    // Calculate progress as a percentage based on completed steps
    const totalSteps = steps.length;
    const progress = completedSteps / totalSteps;

    // Set the width of the progress line
    const progressWidth = progress * 100;
    document.documentElement.style.setProperty('--progress-width', `${progressWidth}%`);

    // Update the ::after pseudo-element width using inline style
    const stepper = document.querySelector('.stepper');
    stepper.style.setProperty('--progress', progress);

    // Calculate width for the ::after element (excluding margins)
    const afterWidth = `calc((100% - 60px) * ${progress})`;
    document.documentElement.style.setProperty('--stepper-progress-width', afterWidth);

    // Apply the width to the ::after element with !important to override
    const style = document.createElement('style');
    style.innerHTML = `.stepper::after { width: ${afterWidth} !important; }`;

    // Remove any previously added style element
    const prevStyle = document.getElementById('progress-style');
    if (prevStyle) prevStyle.remove();

    // Add ID to the new style element and append it to the head
    style.id = 'progress-style';
    document.head.appendChild(style);
  }

  // Function to advance to the next workflow step
  function advanceWorkflow() {
    currentStep++;
    if (currentStep > steps.length) currentStep = steps.length;

    // Update UI to show previous steps as completed and current step as active
    steps.forEach((step, index) => {
      step.classList.remove('active', 'completed', 'next');

      if (index < currentStep - 1) {
        step.classList.add('completed');
      } else if (index === currentStep - 1) {
        step.classList.add('active');
      }
    });

    updateProgressLine(currentStep - 1);

    // Show the appropriate panel based on current step
    updatePanelVisibility();
  }

  // Function to update panel visibility based on current step
  function updatePanelVisibility() {
    const manualEntryPanel = document.getElementById('manual-entry-panel');
    const carteInfoPanel = document.getElementById('carte-info-panel');

    // For step 1 (after verification), show carte info panel
    if (currentStep >= 1) {
      manualEntryPanel.style.display = 'none';
      carteInfoPanel.style.display = 'block';
    } else {
      manualEntryPanel.style.display = 'block';
      carteInfoPanel.style.display = 'none';
    }
  }

  // Handle "Vérifier" button click to complete step 1
  if (verifyBtn) {
    verifyBtn.addEventListener('click', function() {
      // Get form values
      const manualRef = document.getElementById('manual-ref').value;
      const manualOf = document.getElementById('manual-of').value;

      // Validate form (basic validation, enhance as needed)
      if (!manualRef || !manualOf) {
        alert('Veuillez remplir tous les champs');
        return;
      }

      // Update card info display
      document.getElementById('ci-ref').textContent = manualRef;
      document.getElementById('ci-of').textContent = manualOf;

      // Complete step 1 (Identification) and activate step 2
      completeStep(1);
      currentStep = 1;

      // Show the carte info panel, hide manual entry
      document.getElementById('manual-entry-panel').style.display = 'none';
      document.getElementById('carte-info-panel').style.display = 'block';

      // Start inspection timer
      startInspectionTimer();
    });
  }

  // Handle other workflow buttons
  if (inspectBotBtn) {
    inspectBotBtn.addEventListener('click', function() {
      if (currentStep >= 1) {
        completeStep(2);  // Complete Inspection BOT
        currentStep = 2;
      }
    });
  }

  if (inspectTopBtn) {
    inspectTopBtn.addEventListener('click', function() {
      if (currentStep >= 2) {
        completeStep(3);  // Complete Inspection TOP
        currentStep = 3;
      }
    });
  }

  if (validateBtn) {
    validateBtn.addEventListener('click', function() {
      if (currentStep >= 3) {
        completeStep(4);  // Complete Validation
        currentStep = 4;

        // Optional: Show completion message or take further action
        setTimeout(() => {
          alert('Inspection terminée et validée avec succès!');
        }, 500);
      }
    });
  }

  // Function to start the inspection timer
  function startInspectionTimer() {
    const timerElement = document.getElementById('inspection-time');
    let seconds = 0;

    // Update timer every second
    const timer = setInterval(function() {
      seconds++;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      // Format as HH:MM:SS
      timerElement.textContent =
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(secs).padStart(2, '0');
    }, 1000);

    // Store timer reference (optionally clear on completion)
    window.inspectionTimer = timer;
  }
});
