document.addEventListener('DOMContentLoaded', function() {
    const navDetails = document.querySelector('.nav-details');
    const navList = document.querySelector('.nav-list');
    
    function handleResize() {
        if (window.innerWidth > 768) {
            navDetails.setAttribute('open', '');
        } else {
            navDetails.removeAttribute('open');
        }
    }
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    navDetails.removeAttribute('open');
                }, 50);
            }
        });
    });
    
    navDetails.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            const rect = navList.getBoundingClientRect();
            const isClickInsideMenu = (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            );
            
            if (!isClickInsideMenu && navDetails.hasAttribute('open')) {
                navDetails.removeAttribute('open');
            }
        }
    });
    
    navDetails.addEventListener('toggle', function() {
        if (window.innerWidth <= 768) {
            if (navDetails.open) {
                navList.style.transform = 'translateY(-100%)';
                navList.offsetHeight;
                navList.style.transform = 'translateY(0)';
            } else {
                navList.style.transform = 'translateY(-100%)';
            }
        }
    });
});
