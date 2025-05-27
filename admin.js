document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('inspection-table');
  
    const fetchData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/inspection-images'); // Vérifie bien cette URL
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données.');
        }
  
        const { images } = await response.json(); // On extrait la liste d'images
        console.log(images); // Pour vérifier les données dans la console
  
        tableBody.innerHTML = ''; // On vide le tableau
  
        images.forEach(item => {
          const row = document.createElement('tr');
  
          // Liens conditionnels seulement si le chemin n'est pas "aucun"
          const linkTop = item.path_top && item.path_top !== 'aucun'
            ? `<a href="${item.path_top}" target="_blank">View TOP</a>`
            : 'aucun';
  
          const linkBot = item.path_bot && item.path_bot !== 'aucun'
            ? `<a href="${item.path_bot}" target="_blank">View BOT</a>`
            : 'aucun';
  
          row.innerHTML = `
            <td>${item.id_operateur || '--'}</td>
            <td>${item.OF || '--'}</td>
            <td>${item.PRF || '--'}</td>
            <td>${item.SN || '--'}</td>
            <td>${item.resultat || '--'}</td>
            <td>${item.defauts || '--'}</td>
            <td>${linkTop}</td>
            <td>${linkBot}</td>
            <td>${item.date ? new Date(item.date).toLocaleDateString() : '--'}</td>
          `;
  
          tableBody.appendChild(row);
        });
  
      } catch (error) {
        console.error('Erreur:', error);
        alert('Impossible de récupérer les données.');
      }
    };
  
    fetchData();
  });
  const fetchStats = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/stats');
      if (!response.ok) throw new Error('Erreur stats');
  
      const stats = await response.json();
  
      document.getElementById('total-inspections').textContent = stats.total;
      const failRate = stats.total > 0 ? ((stats.fail / stats.total) * 100).toFixed(1) : 0;
      const passRate = stats.total > 0 ? ((stats.pass / stats.total) * 100).toFixed(1) : 0;
  
      document.getElementById('fail-rate').textContent = `${failRate}%`;
      document.getElementById('pass-rate').textContent = `${passRate}%`;
      document.getElementById('frequent-defect').textContent = stats.frequent_defect;
      document.getElementById('defect-count').textContent = `${stats.defect_count} occurrences`;
  
      document.getElementById('progress-fail').style.width = `${failRate}%`;
      document.getElementById('progress-pass').style.width = `${passRate}%`;
      document.getElementById('progress-total').style.width = '100%';
  
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };
  
  fetchStats();
  
  