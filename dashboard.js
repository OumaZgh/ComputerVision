async function fetchStats() {
    try {
        const response = await fetch('/stats'); // 🔹 Assure-toi que l'API retourne bien du JSON

        if (!response.ok) {
            throw new Error("Erreur lors de la récupération des données !");
        }

        const data = await response.json(); 
        
        console.log("Données JSON reçues :", data); 
        

        updateDashboard(data);
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// ✅ Mise à jour des valeurs du tableau de bord
function updateDashboard(data) {
    if (!data) {
        console.error("Données invalides !");
        return;
    }

    // ✅ Vérification avant mise à jour pour éviter les erreurs d'ID manquants
    const elements = {
        totalValue: document.getElementById('total-value'),
        passValue: document.getElementById('pass-value'),
        failValue: document.getElementById('fail-value'),
        defectName: document.getElementById('defect-name'),
        defectCount: document.getElementById('defect-count'),
        currentDate: document.getElementById('current-date'),
        lastUpdate: document.getElementById('last-update')
    };

    // 🔹 Mise à jour uniquement si l'élément existe
    if (elements.totalValue) elements.totalValue.innerText = data.total || "Non disponible";
    if (elements.passValue) elements.passValue.innerText = `${data.pass || 0} (${data.pass_percentage?.toFixed(2) || "0"}%)`;
    if (elements.failValue) elements.failValue.innerText = `${data.fail || 0} (${data.fail_percentage?.toFixed(2) || "0"}%)`;
    if (elements.defectName) elements.defectName.innerText = data.frequent_defect || "Aucun défaut";
    if (elements.defectCount) elements.defectCount.innerText = `${data.defect_count || 0} occurrences`;
    if (elements.currentDate) elements.currentDate.innerText = `📅 Aujourd'hui : ${new Date().toLocaleDateString('fr-FR')}`;
    if (elements.lastUpdate) elements.lastUpdate.innerText = `⏳ Dernière mise à jour : ${data.last_update || new Date().toLocaleString('fr-FR')}`;

    updateChart(data.pass, data.fail);
}

// ✅ Création et mise à jour du graphique
function drawChart(pass, fail) {
    const ctx = document.getElementById('passFailChart')?.getContext('2d');

    if (!ctx) {
        console.error("Erreur : Canvas 'passFailChart' introuvable !");
        return;
    }

    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Conforme', 'Non Conforme'],
            datasets: [{
                data: [pass, fail],
                backgroundColor: ['#162b4d', '#ff9933'],
                borderWidth: 1
            }]
        }
    });
}


function updateChart(pass, fail) {
    if (!window.myChart) {
        console.warn("Le graphique n'existe pas encore, création...");
        drawChart(pass, fail);
        return;
    }

    window.myChart.data.datasets[0].data = [pass, fail];
    window.myChart.update();
}

function updateDateTime() {
    let now = new Date();
    const currentDate = document.getElementById('current-date');
    const lastUpdate = document.getElementById('last-update');

    if (currentDate) currentDate.innerText = `📅 Aujourd'hui : ${now.toLocaleDateString('fr-FR')}`;
    if (lastUpdate) lastUpdate.innerText = `⏳ Dernière mise à jour : ${now.toLocaleString('fr-FR')}`;
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("Page chargée, lancement de fetchStats()");
    fetchStats();
});

setInterval(updateDateTime, 10000);
document.addEventListener('DOMContentLoaded', updateDateTime);