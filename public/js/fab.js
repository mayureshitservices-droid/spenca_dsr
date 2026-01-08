// FAB Menu Functionality
document.addEventListener('DOMContentLoaded', function () {
    const fabMain = document.getElementById('fabMain');
    const fabMenu = document.getElementById('fabMenu');
    const fabBackdrop = document.getElementById('fabBackdrop');
    const fabIcon = document.getElementById('fabIcon');
    const fabMinis = document.querySelectorAll('#fabMenu a');

    let isOpen = false;

    // Toggle FAB menu
    function toggleFAB() {
        isOpen = !isOpen;

        if (isOpen) {
            openFAB();
        } else {
            closeFAB();
        }
    }

    // Open FAB menu
    function openFAB() {
        // Main FAB animations
        fabIcon.classList.add('rotate-45');
        fabMain.classList.add('bg-gradient-to-r', 'from-pink-600', 'to-red-600');
        fabMain.classList.remove('from-indigo-600', 'to-purple-600');

        // Backdrop
        fabBackdrop.classList.remove('invisible', 'opacity-0');
        fabBackdrop.classList.add('visible', 'opacity-100');

        // Menu
        fabMenu.classList.remove('invisible', 'opacity-0', 'translate-y-10');
        fabMenu.classList.add('visible', 'opacity-100', 'translate-y-0');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    // Close FAB menu
    function closeFAB() {
        // Main FAB animations
        fabIcon.classList.remove('rotate-45');
        fabMain.classList.add('from-indigo-600', 'to-purple-600');
        fabMain.classList.remove('from-pink-600', 'to-red-600');

        // Backdrop
        fabBackdrop.classList.remove('visible', 'opacity-100');
        fabBackdrop.classList.add('invisible', 'opacity-0');

        // Menu
        fabMenu.classList.remove('visible', 'opacity-100', 'translate-y-0');
        fabMenu.classList.add('invisible', 'opacity-0', 'translate-y-10');

        // Restore body scroll
        document.body.style.overflow = '';
        isOpen = false;
    }

    // Event listeners
    if (fabMain) {
        fabMain.addEventListener('click', toggleFAB);
    }

    if (fabBackdrop) {
        fabBackdrop.addEventListener('click', closeFAB);
    }

    // Close on ESC key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) {
            closeFAB();
        }
    });

    // Close FAB when clicking on mini FAB
    fabMinis.forEach(mini => {
        mini.addEventListener('click', function () {
            setTimeout(closeFAB, 200);
        });
    });
});
