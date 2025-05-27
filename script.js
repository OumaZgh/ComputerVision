 tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#1c3559',
                        secondary: '#e78a2d',
                        light: '#fefefe',
                        accent: '#4ade80',
                        danger: '#ef4444',
                        dark: '#111827',
                        industrial: '#1c3559',
                        panel: '#0f172a'
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['Roboto Mono', 'monospace']
                    },
                    boxShadow: {
                        'industrial': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                        'panel': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)'
                    }
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            // Gestion des modales
            const loginModal = document.getElementById('loginModal');
            const roleModal = document.getElementById('roleModal');
            const modalClose = document.querySelectorAll('.modal-close');

            // Ouvrir modale de sélection de rôle
            document.querySelectorAll('[href="#login"]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    roleModal.classList.remove('hidden');
                    document.body.classList.add('overflow-hidden');
                });
            });

            // Fermer modales
            modalClose.forEach(btn => {
                btn.addEventListener('click', () => {
                    loginModal.classList.add('hidden');
                    roleModal.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden');
                });
            });

            // Sélection rôle (opérateur/admin)
            document.querySelectorAll('.role-select').forEach(btn => {
                btn.addEventListener('click', function() {
                    const role = this.getAttribute('data-role');
                    document.getElementById('loginTitle').textContent =
                        role === 'operator' ? 'Connexion Opérateur' : 'Connexion Administrateur';
                    document.getElementById('loginIcon').className =
                        role === 'operator' ? 'fas fa-user-shield' : 'fas fa-user-cog';
                    document.getElementById('loginIcon').parentNode.className =
                        role === 'operator' ? 'w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-industrial' :
                        'w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-industrial';

                    roleModal.classList.add('hidden');
                    loginModal.classList.remove('hidden');
                });
            });

            // Toggle password visibility
            document.querySelector('.password-toggle').addEventListener('click', (e) => {
                e.preventDefault();
                const passwordInput = document.getElementById('loginPassword');
                const eyeIcon = e.currentTarget.querySelector('i');

                if(passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });

            // Redirection selon le rôle
            // Supposons que cette fonction est appelée lorsque le formulaire de connexion est soumis
            document.getElementById('loginForm').addEventListener('submit', function(event) {
                event.preventDefault();

                // Récupération des valeurs du formulaire
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;

                // Création des données du formulaire pour l'envoi
                const formData = new FormData();
                formData.append('username', username);
                formData.append('password', password);

                // Envoi de la requête au serveur
                fetch('/login', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    if (response.redirected) {
                        window.location.href = response.url;
                    } else {
                        // Gestion d'erreur si nécessaire
                        return response.json();
                    }
                })
                .then(data => {
                    if (data && data.error) {
                        // Afficher le message d'erreur
                        alert(data.error);
                    }
                })
                .catch(error => {
                    console.error('Erreur:', error);
                    alert('Une erreur est survenue lors de la connexion');
                });
            });

            // Animation des statistiques
            const stats = document.querySelectorAll('.stat-item');
            if(stats.length > 0) {
                stats.forEach(stat => {
                    const target = +stat.getAttribute('data-target');
                    const suffix = stat.getAttribute('data-suffix') || '';
                    let count = 0;
                    const duration = 2000;
                    const increment = target / (duration / 16);

                    const updateCount = () => {
                        count += increment;
                        if(count < target) {
                            stat.textContent = Math.floor(count) + suffix;
                            requestAnimationFrame(updateCount);
                        } else {
                            stat.textContent = target + suffix;
                        }
                    };

                    const observer = new IntersectionObserver((entries) => {
                        if(entries[0].isIntersecting) {
                            updateCount();
                            observer.unobserve(stat);
                        }
                    });

                    observer.observe(stat);
                });
            }
        });
        document.addEventListener('DOMContentLoaded', () => {
        // Animation au défilement
        const animateOnScroll = () => {
            const elements = document.querySelectorAll('.transform-on-scroll, .reveal-animation, .fade-in-item');

            elements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;

                if (elementTop < windowHeight - 100) {
                    element.classList.add('visible');
                }
            });
        };

        window.addEventListener('scroll', animateOnScroll);
        animateOnScroll(); // Exécuter au chargement initial

        // Interaction avec les points technologiques
        const techHotspots = document.querySelectorAll('.tech-hotspot');

        techHotspots.forEach(hotspot => {
            hotspot.addEventListener('mouseenter', () => {
                const tooltip = hotspot.querySelector('.tech-tooltip');
                tooltip.classList.add('active');
            });

            hotspot.addEventListener('mouseleave', () => {
                const tooltip = hotspot.querySelector('.tech-tooltip');
                tooltip.classList.remove('active');
            });
        });
    });
    document.addEventListener('DOMContentLoaded', () => {
        // Animation des statistiques avec Intersection Observer
        const stats = document.querySelectorAll('.stat-item');
        const progressBars = document.querySelectorAll('.stat-progress');

        const animateValue = (element, start, end, suffix, duration) => {
            const range = end - start;
            let current = start;
            const increment = end > start ? 1 : -1;
            const stepTime = Math.abs(Math.floor(duration / range));
            const suffixStr = suffix || '';

            const timer = setInterval(() => {
                current += increment;
                element.textContent = current + suffixStr;
                if (current === end) {
                    clearInterval(timer);
                }
            }, stepTime);
        };

        const animateProgress = (element, target) => {
            let width = 0;
            const duration = 1500;
            const interval = 10;
            const step = (target * interval) / duration;

            const timer = setInterval(() => {
                width += step;
                element.style.width = `${Math.min(width, target)}%`;
                if (width >= target) {
                    clearInterval(timer);
                }
            }, interval);
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (entry.target.classList.contains('stat-item')) {
                        const target = +entry.target.getAttribute('data-target');
                        const suffix = entry.target.getAttribute('data-suffix') || '';
                        animateValue(entry.target, 0, target, suffix, 2000);
                    } else if (entry.target.classList.contains('stat-progress')) {
                        const target = +entry.target.getAttribute('data-target');
                        animateProgress(entry.target, target);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        stats.forEach(stat => observer.observe(stat));
        progressBars.forEach(bar => observer.observe(bar));

        // Animation des éléments au scroll
        const animateOnScroll = () => {
            const elements = document.querySelectorAll('.animate-on-scroll');

            elements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 150;

                if (elementTop < window.innerHeight - elementVisible) {
                    element.classList.add('visible');
                }
            });
        };

        window.addEventListener('scroll', animateOnScroll);
        animateOnScroll(); // Déclencher une première fois pour les éléments visibles dès le chargement
    });