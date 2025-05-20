// Set current year in footer
if (document.getElementById('currentYear')) {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
}

// Mobile menu toggle with improved accessibility
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
let previouslyFocusedElement; // To store focus before menu opens

if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.setAttribute('aria-expanded', 'false');
    mobileMenuButton.setAttribute('aria-controls', 'mobile-menu');

    const openMenu = () => {
        previouslyFocusedElement = document.activeElement; // Store current focus
        mobileMenuButton.setAttribute('aria-expanded', 'true');
        mobileMenu.classList.remove('hidden');
        document.body.classList.add('mobile-menu-active');
        mobileMenu.addEventListener('keydown', trapFocus);
        // Focus the first focusable element in the menu or the menu itself
        const firstFocusableElement = mobileMenu.querySelector('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (firstFocusableElement) {
            firstFocusableElement.focus();
        } else {
            mobileMenu.focus(); // Fallback if no focusable elements found
        }
    };

    const closeMenu = () => {
        mobileMenuButton.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.add('hidden');
        document.body.classList.remove('mobile-menu-active');
        mobileMenu.removeEventListener('keydown', trapFocus);
        if (previouslyFocusedElement) {
            previouslyFocusedElement.focus(); // Restore previous focus
        }
    };

    mobileMenuButton.addEventListener('click', () => {
        const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !mobileMenuButton.contains(e.target)) {
            if (mobileMenuButton.getAttribute('aria-expanded') === 'true') {
                closeMenu();
            }
        }
    });

    // Close menu with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenuButton.getAttribute('aria-expanded') === 'true') {
            closeMenu();
        }
    });

    const trapFocus = (e) => {
        if (e.key !== 'Tab') {
            return;
        }
        const focusableElements = Array.from(mobileMenu.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
        if (focusableElements.length === 0) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                e.preventDefault();
            }
        }
    };
}

// Smooth scroll with improved performance
const smoothScroll = (targetElement) => {
    const header = document.querySelector('header'); // Or your specific header selector
    const headerOffset = header ? header.offsetHeight : 80; // Dynamically get header height, fallback to 80
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
};

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            smoothScroll(targetElement);
        }
    });
});

// Lazy loading images with Intersection Observer
const lazyLoadImages = () => {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    img.classList.remove('opacity-0');
                    img.classList.add('opacity-100', 'transition-opacity', 'duration-300');
                }
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
};

// Scroll animations with Intersection Observer
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    elements.forEach(element => {
        observer.observe(element);
    });
};

// Initialize all features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    lazyLoadImages();
    animateOnScroll();
});

// Debounce function
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

// Add scroll to top button
const createScrollTopButton = () => {
    // Skip creating button for map page
    if (window.location.pathname.includes('/map/')) {
        return;
    }

    const button = document.createElement('button');
    button.innerHTML = '<i class="fas fa-arrow-up"></i>';
    button.className = 'scroll-top-button';
    document.body.appendChild(button);

    const handleScroll = () => {
        if (window.pageYOffset > 300) {
            button.classList.add('is-visible');
        } else {
            button.classList.remove('is-visible');
        }
    };

    // Call handleScroll once on load to set the initial state
    handleScroll();

    window.addEventListener('scroll', debounce(handleScroll, 200));

    button.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
};

createScrollTopButton(); 