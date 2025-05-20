// Parallax Scrolling Effect
const parallaxElements = document.querySelectorAll('.parallax');
let ticking = false;

// Function to update parallax elements that are visible
const updateVisibleParallaxElements = () => {
    parallaxElements.forEach(element => {
        if (element.classList.contains('is-visible-for-parallax')) {
            const speed = parseFloat(element.dataset.speed) || 0.5;
            const yPos = -(window.pageYOffset * speed);
            element.style.transform = `translateY(${yPos}px)`;
        }
    });
    ticking = false;
};

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(updateVisibleParallaxElements);
        ticking = true;
    }
});

// Intersection Observer for Parallax
if ('IntersectionObserver' in window) {
    const parallaxObserverOptions = {
        root: null, // relative to document viewport 
        rootMargin: '0px',
        threshold: 0.01 // 1% of the element is visible
    };

    const parallaxObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible-for-parallax');
            } else {
                entry.target.classList.remove('is-visible-for-parallax');
                // Optional: Reset transform if needed when out of view for a long time
                // entry.target.style.transform = 'translateY(0px)'; 
            }
        });
    }, parallaxObserverOptions);

    parallaxElements.forEach(element => {
        parallaxObserver.observe(element);
    });
} else {
    // Fallback for browsers that don't support IntersectionObserver: mark all as visible
    parallaxElements.forEach(element => element.classList.add('is-visible-for-parallax'));
    // Initial update for browsers without IntersectionObserver, as they won't trigger the observer callback
    if (parallaxElements.length > 0) updateVisibleParallaxElements();
}

// --- Lightbox Manager (Singleton for shared lightbox) ---
const LightboxManager = (() => {
    let instance;
    let lightboxElement, lightboxImage, prevButton, nextButton, closeButton, spinnerElement;
    let currentGallery = null;
    let previouslyFocusedElement = null;

    function createLightboxDOM() {
        lightboxElement = document.createElement('div');
        lightboxElement.classList.add('lightbox');
        lightboxElement.setAttribute('role', 'dialog');
        lightboxElement.setAttribute('aria-modal', 'true');
        lightboxElement.setAttribute('aria-label', 'Image gallery');

        const lightboxContent = document.createElement('div');
        lightboxContent.classList.add('lightbox-content');

        lightboxImage = document.createElement('img');
        lightboxImage.classList.add('lightbox-image');
        lightboxImage.setAttribute('alt', 'Enlarged image');

        // Create a container for the image and spinner for better positioning if needed
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('lightbox-image-container');

        spinnerElement = document.createElement('div');
        spinnerElement.classList.add('lightbox-spinner', 'hidden'); // Initially hidden

        imageContainer.appendChild(lightboxImage);
        imageContainer.appendChild(spinnerElement); // Spinner within the image container

        prevButton = document.createElement('button');
        prevButton.classList.add('lightbox-button', 'lightbox-button-prev');
        prevButton.innerHTML = '←';
        prevButton.setAttribute('aria-label', 'Previous image');

        nextButton = document.createElement('button');
        nextButton.classList.add('lightbox-button', 'lightbox-button-next');
        nextButton.innerHTML = '→';
        nextButton.setAttribute('aria-label', 'Next image');

        closeButton = document.createElement('button');
        closeButton.classList.add('lightbox-button', 'lightbox-button-close');
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Close gallery');

        lightboxContent.appendChild(imageContainer); // Add image container instead of direct image
        lightboxContent.appendChild(prevButton);
        lightboxContent.appendChild(nextButton);
        lightboxContent.appendChild(closeButton);
        lightboxElement.appendChild(lightboxContent);
        document.body.appendChild(lightboxElement);

        // Event Listeners for shared buttons
        closeButton.addEventListener('click', () => instance.hide());
        prevButton.addEventListener('click', () => currentGallery?.showPrevious());
        nextButton.addEventListener('click', () => currentGallery?.showNext());

        // Keyboard navigation for lightbox
        lightboxElement.addEventListener('keydown', handleLightboxKeydown);
    }
    
    function handleLightboxKeydown(e) {
        if (!currentGallery) return;
        if (e.key === 'Escape') instance.hide();
        if (e.key === 'ArrowLeft') currentGallery.showPrevious();
        if (e.key === 'ArrowRight') currentGallery.showNext();
        
        if (e.key === 'Tab') {
            const focusableSelector = 'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
            const focusableElements = Array.from(lightboxElement.querySelectorAll(focusableSelector))
                                          .filter(el => el.offsetParent !== null && !el.hasAttribute('disabled'));

            if (focusableElements.length === 0) {
                // If no focusable elements, prevent tabbing out of the modal container itself
                // This might happen if only an image is shown without controls.
                // Ensure lightboxElement has tabindex="-1" if it needs to contain focus in such cases.
                e.preventDefault();
                return;
            }

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
            // If tabbing within the focusable elements, let it happen naturally.
        }
    }

    function init() {
        if (!lightboxElement) {
            createLightboxDOM();
            // Ensure the lightbox container itself can be focused if no interactive elements are inside, 
            // and to contain focus in the rare case all inner elements are disabled.
            lightboxElement.setAttribute('tabindex', '-1'); 
        }
        return {
            show: (galleryInstance, startIndex) => {
                currentGallery = galleryInstance;
                previouslyFocusedElement = document.activeElement;
                currentGallery.currentIndex = startIndex;
                currentGallery.updateLightboxImage();
                lightboxElement.classList.remove('hidden');
                lightboxElement.classList.add('is-flexed');
                document.body.style.overflow = 'hidden';
                closeButton.focus();
            },
            hide: () => {
                lightboxElement.classList.add('hidden');
                lightboxElement.classList.remove('is-flexed');
                document.body.style.overflow = '';
                spinnerElement.classList.add('hidden'); // Ensure spinner is hidden on close
                lightboxImage.classList.remove('is-loading'); // Ensure loading class is removed
                currentGallery = null;
                if (previouslyFocusedElement) {
                    previouslyFocusedElement.focus();
                }
            },
            updateImageSrc: (src, altText = 'Enlarged image') => {
                if (lightboxImage && spinnerElement) {
                    lightboxImage.classList.add('is-loading');
                    spinnerElement.classList.remove('hidden');
                    
                    // Clear previous src to ensure load event fires correctly for cached images
                    lightboxImage.removeAttribute('src'); 

                    const onImageLoad = () => {
                        lightboxImage.classList.remove('is-loading');
                        spinnerElement.classList.add('hidden');
                        lightboxImage.removeEventListener('load', onImageLoad);
                        lightboxImage.removeEventListener('error', onImageError);
                    };

                    const onImageError = () => {
                        lightboxImage.classList.remove('is-loading');
                        spinnerElement.classList.add('hidden');
                        lightboxImage.alt = 'Image failed to load'; // Update alt text on error
                        // Optionally, set a placeholder broken image src
                        // lightboxImage.src = 'path/to/broken-image.svg'; 
                        lightboxImage.removeEventListener('load', onImageLoad);
                        lightboxImage.removeEventListener('error', onImageError);
                    };

                    lightboxImage.addEventListener('load', onImageLoad);
                    lightboxImage.addEventListener('error', onImageError);

                    lightboxImage.src = src;
                    lightboxImage.alt = altText;
                }
            },
            // Expose elements if needed by gallery instances, though direct updates via methods are preferred
            getLightboxImageElement: () => lightboxImage 
        };
    }

    return {
        getInstance: () => {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    };
})();

// Image Gallery with Lightbox
class ImageGallery {
    constructor(container) {
        this.container = container;
        this.images = Array.from(container.querySelectorAll('img')); // Ensure it's an array
        this.currentIndex = 0;
        this.lightboxManager = LightboxManager.getInstance(); // Get the singleton instance
        this.setupGallery();
    }

    setupGallery() {
        // Remove old lightbox creation, navigation buttons, and their direct event listeners from here.
        // The shared LightboxManager now handles DOM and main controls.
        
        // Add click handlers to gallery images
        this.images.forEach((img, index) => {
            // Store the original focused element if it's an image in this gallery
            img.addEventListener('click', (e) => {
                this.lightboxManager.show(this, index);
            });
        });

        // Keyboard navigation for opening with Enter/Space if images are focusable
        // (assuming images or their containers might have tabindex="0")
        this.images.forEach((img, index) => {
            img.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault(); // Prevent space from scrolling
                    this.lightboxManager.show(this, index);
                }
            });
        });
    }

    openLightbox(index) { // This method is now effectively called by lightboxManager.show
        // The logic for showing is now in LightboxManager.show()
        // This specific instance (this) is passed to the manager.
        this.currentIndex = index;
        this.updateLightboxImage();
    }

    closeLightbox() { // This method is now effectively called by lightboxManager.hide
        // Logic is in LightboxManager.hide()
    }

    showPrevious() {
        if (this.images.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.updateLightboxImage();
    }

    showNext() {
        if (this.images.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.updateLightboxImage();
    }

    updateLightboxImage() {
        if (this.images.length > 0 && this.images[this.currentIndex]) {
            const newSrc = this.images[this.currentIndex].src;
            const newAlt = this.images[this.currentIndex].alt || 'Enlarged image';
            this.lightboxManager.updateImageSrc(newSrc, newAlt); // Pass alt text
        } else {
            this.lightboxManager.updateImageSrc('', 'No image to display'); // Clear image or show placeholder
        }
    }
}

// Form Validation
class FormValidator {
    constructor(form) {
        this.form = form;
        this.fields = form.querySelectorAll('[data-validate]');
        this.errorSummaryContainer = this.form.querySelector('.form-error-summary');
        this.setupValidation();
    }

    setupValidation() {
        this.form.setAttribute('novalidate', 'true');

        this.form.addEventListener('submit', (e) => {
            const isValidForm = this.validateForm(true); // Pass true to indicate submit context
            if (!isValidForm) {
                e.preventDefault();
                this.displayErrorSummary();
                if (this.errorSummaryContainer) {
                    this.errorSummaryContainer.focus(); // Focus the summary container
                } else {
                     // Fallback: focus the first invalid field if no summary container
                    const firstInvalidField = this.form.querySelector('[aria-invalid="true"]');
                    if (firstInvalidField) {
                        firstInvalidField.focus();
                    }
                }
            } else {
                this.clearErrorSummary();
            }
        });

        this.fields.forEach(field => {
            field.addEventListener('blur', () => {
                this.validateField(field);
                // After individual field validation, optionally update summary if it's visible
                // This makes the summary more dynamic but can be noisy.
                // if (this.errorSummaryContainer && !this.errorSummaryContainer.hidden) {
                // this.displayErrorSummary();
                // }
            });
        });
    }

    validateField(field, isSubmitContext = false) {
        const value = field.value.trim();
        const rules = field.dataset.validate.split(' ');
        let isValid = true;
        let errorMessage = '';
        const fieldId = field.id || 'field-' + Math.random().toString(36).substring(2, 9);
        if (!field.id) field.id = fieldId;

        for (const rule of rules) {
            switch (rule) {
                case 'required':
                    if (!value) {
                        isValid = false;
                        errorMessage = field.dataset.errorMessageRequired || 'This field is required';
                    }
                    break;
                case 'email':
                    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        isValid = false;
                        errorMessage = field.dataset.errorMessageEmail || 'Please enter a valid email address';
                    }
                    break;
                case 'phone':
                    if (value && !/^\+?[\d\s-]{7,}$/.test(value)) {
                        isValid = false;
                        errorMessage = field.dataset.errorMessagePhone || 'Please enter a valid phone number';
                    }
                    break;
            }
            if (!isValid) break;
        }
        // Only update field status visually if not in submit context OR if field is invalid
        // This avoids re-validating and visually changing already valid fields during a full form submit validation pass
        if (!isSubmitContext || !isValid) {
             this.updateFieldStatus(field, isValid, errorMessage, value, fieldId);
        }
        return isValid;
    }

    validateForm(isSubmitContext = false) {
        let formIsValid = true;
        this.fields.forEach(field => {
            // Pass the submit context to validateField
            if (!this.validateField(field, isSubmitContext)) {
                formIsValid = false;
            }
        });
        return formIsValid;
    }

    updateFieldStatus(field, isValid, errorMessage, fieldValue, fieldId) {
        const errorId = 'error-for-' + fieldId;
        let errorElement = document.getElementById(errorId);

        if (errorElement) {
            errorElement.remove();
        }
        field.removeAttribute('aria-describedby');
        field.removeAttribute('aria-invalid');

        field.classList.toggle('border-red-500', !isValid);
        field.classList.toggle('border-green-500', isValid && fieldValue !== '');

        if (!isValid && errorMessage) {
            errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'error-message text-red-500 text-sm mt-1';
            errorElement.textContent = errorMessage;
            field.parentNode.insertBefore(errorElement, field.nextSibling);
            field.setAttribute('aria-describedby', errorId);
            field.setAttribute('aria-invalid', 'true');
        } else if (isValid && fieldValue !== '') {
            field.setAttribute('aria-invalid', 'false');
        }
    }

    displayErrorSummary() {
        if (!this.errorSummaryContainer) return;

        this.clearErrorSummary(false); // Clear content but don't hide yet
        const errors = [];
        this.fields.forEach(field => {
            if (field.getAttribute('aria-invalid') === 'true') {
                const fieldId = field.id;
                const errorElement = document.getElementById('error-for-' + fieldId);
                const label = this.form.querySelector(`label[for="${fieldId}"]`);
                const fieldName = label ? label.textContent.trim() : (field.getAttribute('aria-label') || field.name || fieldId);
                const message = errorElement ? errorElement.textContent : 'Invalid input.';
                errors.push({ fieldId, fieldName, message });
            }
        });

        if (errors.length > 0) {
            const summaryTitle = document.createElement('h3');
            summaryTitle.textContent = `Please correct the following ${errors.length} error${errors.length > 1 ? 's' : ''}:`;
            summaryTitle.className = 'text-lg font-semibold mb-2'; // Example styling
            this.errorSummaryContainer.appendChild(summaryTitle);

            const list = document.createElement('ul');
            errors.forEach(error => {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = '#' + error.fieldId;
                link.textContent = `${error.fieldName}: ${error.message}`;
                link.onclick = (e) => {
                    e.preventDefault();
                    document.getElementById(error.fieldId)?.focus();
                };
                listItem.appendChild(link);
                list.appendChild(listItem);
            });
            this.errorSummaryContainer.appendChild(list);
            this.errorSummaryContainer.hidden = false; // Make it visible
        } else {
            this.errorSummaryContainer.hidden = true; // Hide if no errors (shouldn't happen if called correctly)
        }
    }

    clearErrorSummary(hideContainer = true) {
        if (this.errorSummaryContainer) {
            this.errorSummaryContainer.innerHTML = ''; // Clear previous summary
            if (hideContainer) {
                this.errorSummaryContainer.hidden = true;
            }
        }
    }
}

// Initialize features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize image galleries
    document.querySelectorAll('.image-gallery').forEach(container => {
        new ImageGallery(container);
    });

    // Initialize form validation
    document.querySelectorAll('form[data-validate]').forEach(form => {
        new FormValidator(form);
    });
}); 