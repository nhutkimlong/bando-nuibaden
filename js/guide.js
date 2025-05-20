document.addEventListener('DOMContentLoaded', function() {
  
    const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzUHeS9O7xKPLADo_DzBWQ60iEgHNHsdTRXVbDTWS1NM3hsHOcg9RMO3KcoUy4vC8Ju/exec'; // GIỮ NGUYÊN URL APPS SCRIPT CỦA BẠN
    let ITEMS_PER_PAGE; 
    const CACHE_EXPIRATION_MS = 10 * 60 * 1000;

    // Object để lưu trữ toàn bộ dữ liệu đã tải cho mỗi mục
    let allDataStore = {
        tours: null,
        accommodations: null,
        restaurants: null,
        specialties: null
    };

    // Hàm cập nhật số mục trên mỗi trang dựa trên kích thước màn hình
    function updateItemsPerPage() {
        if (window.innerWidth < 768) { // md breakpoint của Tailwind
            ITEMS_PER_PAGE = 3; 
        } else {
            ITEMS_PER_PAGE = 6; 
        }
    }
    updateItemsPerPage(); // Gọi lần đầu

    // Kiểm tra API_BASE_URL
    if (API_BASE_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL' || API_BASE_URL === '') {
        console.error('CRITICAL ERROR: API_BASE_URL is not set in js/guide.js! Data will not load.');
        alert('Configuration Error: Please check API_BASE_URL in js/guide.js.');
        ['tours', 'accommodations', 'restaurants', 'specialties'].forEach(id => {
            const loadingDiv = document.getElementById(`loading-${id}`);
            if (loadingDiv) {
                loadingDiv.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i> Lỗi cấu hình API.`;
                loadingDiv.style.display = 'block';
                const gridElement = document.getElementById(`${id}-grid`);
                if (gridElement) {
                    gridElement.style.display = 'none';
                }
            }
        });
        return;
    }

    /**
     * Tải toàn bộ dữ liệu cho một sheet, sử dụng cache nếu có.
     * @param {string} sheetNameNormalized - Tên sheet đã chuẩn hóa (vd: 'tours', 'accommodations')
     * @param {string} sheetNameForAPI - Tên sheet thực tế để gọi API (vd: 'Tours', 'Accommodations')
     * @returns {Promise<Array<Object>>} - Promise giải quyết với mảng dữ liệu.
     */
    async function fetchAndCacheAllDataForSheet(sheetNameNormalized, sheetNameForAPI) {
        const cacheKey = `guideAllData-${sheetNameNormalized}`;

        const loadingContainer = document.getElementById(`loading-${sheetNameNormalized}`);
        if (loadingContainer) {
            loadingContainer.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu ${sheetNameNormalized}...`;
            loadingContainer.style.display = 'block';
        }

        // 1. Kiểm tra cache
        try {
            const cachedItem = localStorage.getItem(cacheKey);
            if (cachedItem) {
                const parsedCache = JSON.parse(cachedItem);
                if (parsedCache && parsedCache.timestamp && (Date.now() - parsedCache.timestamp < CACHE_EXPIRATION_MS) && Array.isArray(parsedCache.data)) {
                    if (loadingContainer) loadingContainer.style.display = 'none';
                    allDataStore[sheetNameNormalized] = parsedCache.data;
                    return parsedCache.data;
                }
                localStorage.removeItem(cacheKey);
            }
        } catch (e) {
            console.warn(`[${sheetNameForAPI}] Error reading ALL data from localStorage for ${cacheKey}:`, e);
            localStorage.removeItem(cacheKey);
        }

        // 2. Nếu không có cache, gọi API để fetch all
        try {
            const response = await fetch(`${API_BASE_URL}?sheet=${sheetNameForAPI}&fetchAll=true`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[${sheetNameForAPI}] API HTTP error! Status: ${response.status}, Message: ${errorText}`);
                throw new Error(`HTTP error ${response.status} for ${sheetNameForAPI}: ${errorText}`);
            }
            const result = await response.json();

            if (result.error) {
                console.error(`[${sheetNameForAPI}] API Error while fetching ALL data:`, result.error);
                throw new Error(result.error);
            }
            
            if (!Array.isArray(result.data)) {
                 console.error(`[${sheetNameForAPI}] API did not return a data array for ALL data. Received:`, result);
                 throw new Error(`Invalid data format from API for ${sheetNameForAPI}.`);
            }
            allDataStore[sheetNameNormalized] = result.data;

            try {
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result.data }));
            } catch (e) {
                console.warn(`[${sheetNameForAPI}] Error saving ALL data to localStorage for ${cacheKey}:`, e);
            }

            if (loadingContainer) loadingContainer.style.display = 'none';
            return result.data;

        } catch (error) {
            console.error(`[${sheetNameForAPI}] General error fetching/parsing ALL data:`, error);
            if (loadingContainer) {
                loadingContainer.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> Không thể tải dữ liệu ${sheetNameNormalized}.`;
            }
            allDataStore[sheetNameNormalized] = []; // Đặt thành mảng rỗng nếu lỗi
            return [];
        }
    }

    /**
     * Render các nút điều khiển phân trang.
     */
    function renderPaginationControls(sectionId, currentPage, totalItems, itemsPerPage, renderFunction) {
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        const container = document.getElementById(`${sectionId}-pagination`);

        if (!container) return;
        container.innerHTML = ''; 
        if (totalPages <= 1) return;

        let paginationHTML = '<nav aria-label="Page navigation"><ul class="inline-flex items-center -space-x-px">';
        // Nút Previous
        paginationHTML += `<li><button data-page="${currentPage - 1}" class="pagination-btn prev-btn py-2 px-3 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''}><span class="sr-only">Previous</span><i class="fas fa-chevron-left"></i></button></li>`;

        // Logic hiển thị số trang (giữ như cũ hoặc đơn giản hóa nếu muốn)
        const MAX_VISIBLE_PAGES = 5;
        let startPage, endPage;
        if (totalPages <= MAX_VISIBLE_PAGES) {
            startPage = 1; endPage = totalPages;
        } else {
            const maxPagesBeforeCurrentPage = Math.floor(MAX_VISIBLE_PAGES / 2);
            const maxPagesAfterCurrentPage = Math.ceil(MAX_VISIBLE_PAGES / 2) - 1;
            if (currentPage <= maxPagesBeforeCurrentPage) {
                startPage = 1; endPage = MAX_VISIBLE_PAGES;
            } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
                startPage = totalPages - MAX_VISIBLE_PAGES + 1; endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrentPage; endPage = currentPage + maxPagesAfterCurrentPage;
            }
        }
        if (startPage > 1) {
            paginationHTML += `<li><button data-page="1" class="pagination-btn page-num-btn py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700">1</button></li>`;
            if (startPage > 2) paginationHTML += `<li><span class="py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300">...</span></li>`;
        }
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<li><button data-page="${i}" class="pagination-btn page-num-btn py-2 px-3 leading-tight ${i === currentPage ? 'text-primary-600 bg-primary-50 border-primary-300 z-10' : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700'}" ${i === currentPage ? 'aria-current="page"' : ''}>${i}</button></li>`;
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationHTML += `<li><span class="py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300">...</span></li>`;
            paginationHTML += `<li><button data-page="${totalPages}" class="pagination-btn page-num-btn py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700">${totalPages}</button></li>`;
        }
        // Nút Next
        paginationHTML += `<li><button data-page="${currentPage + 1}" class="pagination-btn next-btn py-2 px-3 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages ? 'disabled' : ''}><span class="sr-only">Next</span><i class="fas fa-chevron-right"></i></button></li>`;
        paginationHTML += '</ul></nav>';
        container.innerHTML = paginationHTML;

        container.querySelectorAll('.pagination-btn[data-page]').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                if (button.disabled) return;
                const targetPage = parseInt(button.dataset.page);
                document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                renderFunction(targetPage);
            });
        });
    }

    /**
     * Render một section (Tours, Accommodations, etc.)
     * @param {string} sectionIdNormalized - vd: 'tours'
     * @param {string} sheetNameForAPI - vd: 'Tours'
     * @param {Function} cardRenderFunction - Hàm để render HTML cho một card item
     * @param {number} currentPage - Trang hiện tại để hiển thị
     */
    async function renderSection(sectionIdNormalized, sheetNameForAPI, cardRenderFunction, currentPage = 1) {
        const gridContainer = document.getElementById(`${sectionIdNormalized}-grid`);
        const paginationContainer = document.getElementById(`${sectionIdNormalized}-pagination`);

        if (!gridContainer) {
            console.error(`Grid container for ${sectionIdNormalized} not found!`);
            return;
        }
        gridContainer.innerHTML = ''; // Xóa nội dung cũ
        if (paginationContainer) paginationContainer.innerHTML = '';

        // Nếu chưa có dữ liệu trong store, tải về
        if (allDataStore[sectionIdNormalized] === null) {
            await fetchAndCacheAllDataForSheet(sectionIdNormalized, sheetNameForAPI);
        }

        const allItems = allDataStore[sectionIdNormalized];
        if (allItems === null) { // Vẫn là null sau khi fetch (có lỗi)
             gridContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center p-4">Không thể tải dữ liệu cho ${sectionIdNormalized}.</p>`;
             return;
        }

        const totalItems = allItems.length;

        if (totalItems === 0) {
            gridContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center p-4">Hiện chưa có thông tin ${sectionIdNormalized} nào.</p>`;
            return;
        }

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const itemsForCurrentPage = allItems.slice(startIndex, endIndex);

        if (itemsForCurrentPage.length === 0 && currentPage > 1) {
            gridContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center p-4">Không có ${sectionIdNormalized} nào cho trang ${currentPage}.</p>`;
        } else {
            itemsForCurrentPage.forEach(item => {
                gridContainer.innerHTML += cardRenderFunction(item);
            });
        }
        // Gọi lại hàm renderSection cho section này khi phân trang
        renderPaginationControls(sectionIdNormalized, currentPage, totalItems, ITEMS_PER_PAGE, 
            (newPage) => renderSection(sectionIdNormalized, sheetNameForAPI, cardRenderFunction, newPage)
        );
    }

    // --- Các hàm render card cho từng loại ---
    function renderTourCard(tour) {
        return `
            <div class="tour-card border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
                <img loading="lazy" height="192" 
                    src="${tour.image ? tour.image : '../../assets/images/gallery/placeholder-1-800.webp'}"
                    srcset="${tour.image ? '' : '../../assets/images/gallery/placeholder-1-400.webp 400w, ../../assets/images/gallery/placeholder-1-800.webp 800w, ../../assets/images/gallery/placeholder-1-1200.webp 1200w'}"
                    sizes="(max-width: 600px) 400px, (max-width: 1024px) 800px, 1200px"
                    alt="${tour.name || 'Hình ảnh tour'}" class="w-full h-40 sm:h-48 object-cover">
                <div class="p-3 sm:p-4 flex flex-col flex-grow">
                    <h3 class="text-md sm:text-lg font-semibold text-primary-600 mb-1 sm:mb-2">${tour.name || 'Tên tour không xác định'}</h3>
                    <p class="text-xs sm:text-sm text-gray-600 mb-2 flex-grow mobile-description-truncate">${tour.description || 'Không có mô tả.'}</p>
                    <div class="text-xs text-gray-500 mb-2 mt-auto">
                        ${tour.duration ? `<span class="font-semibold">Thời gian:</span> ${tour.duration}<br class="sm:hidden"> ` : ''}
                        ${tour.activities ? `<span class="font-semibold mobile-hideable tour-activities">Hoạt động:</span> <span class="mobile-hideable tour-activities-content">${tour.activities}</span>` : ''}
                    </div>
                    <a href="${tour.detailsLink || tour.detailslink || '#'}" target="_blank" rel="noopener noreferrer" class="inline-block bg-primary-500 hover:bg-primary-600 text-white text-xs sm:text-sm font-medium py-1.5 px-3 sm:py-2 sm:px-4 rounded-md transition duration-150 self-start">
                        ${tour.buttonText || 'Xem chi tiết'}
                    </a>
                </div>
            </div>`;
    }

    function renderAccommodationCard(item) {
        let starsHTML = '';
        if (item.stars && !isNaN(parseInt(item.stars))) {
            const starCount = parseInt(item.stars);
            starsHTML = '<div class="flex items-center text-yellow-400 mb-1 sm:mb-2 text-xs sm:text-sm">';
            for (let i = 0; i < starCount; i++) starsHTML += '<i class="fa-solid fa-star"></i>';
            starsHTML += `<span class="text-xs text-gray-500 ml-1 sm:ml-2">(${starCount} sao)</span></div>`;
        }
        return `
            <div class="accommodation-card border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
                <img loading="lazy" height="192" 
                    src="${item.image ? item.image : '../../assets/images/gallery/placeholder-2-800.webp'}"
                    srcset="${item.image ? '' : '../../assets/images/gallery/placeholder-2-400.webp 400w, ../../assets/images/gallery/placeholder-2-800.webp 800w, ../../assets/images/gallery/placeholder-2-1200.webp 1200w'}"
                    sizes="(max-width: 600px) 400px, (max-width: 1024px) 800px, 1200px"
                    alt="${item.name || 'Hình ảnh lưu trú'}" class="w-full h-40 sm:h-48 object-cover">
                <div class="p-3 sm:p-4 flex flex-col flex-grow">
                    <h3 class="text-md sm:text-lg font-semibold text-accent-600 mb-1 sm:mb-2">${item.name || 'Tên địa điểm không xác định'}</h3>
                    ${starsHTML}
                    <div class="flex-grow text-xs sm:text-sm">
                        ${item.address ? `<p class="text-gray-600 mb-1 mobile-address-truncate"><i class="fa-solid fa-map-marker-alt mr-1 sm:mr-2 text-gray-400"></i>${item.address}</p>` : ''}
                        ${item.phone ? `<p class="text-gray-600 mb-2"><i class="fa-solid fa-phone mr-1 sm:mr-2 text-gray-400"></i>${item.phone}</p>` : ''}
                    </div>
                    <a href="${item.mapLink || item.maplink || '#'}" target="_blank" rel="noopener noreferrer" class="inline-block bg-accent-500 hover:bg-accent-600 text-white text-xs sm:text-sm font-medium py-1.5 px-3 sm:py-2 sm:px-4 rounded-md transition duration-150 self-start mt-auto">
                        Xem trên bản đồ
                    </a>
                </div>
            </div>`;
    }
    
    function renderRestaurantCard(item) {
         return `
            <div class="restaurant-card border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
                <img loading="lazy" height="192" 
                    src="${item.image ? item.image : '../../assets/images/gallery/placeholder-3-800.webp'}"
                    srcset="${item.image ? '' : '../../assets/images/gallery/placeholder-3-400.webp 400w, ../../assets/images/gallery/placeholder-3-800.webp 800w, ../../assets/images/gallery/placeholder-3-1200.webp 1200w'}"
                    sizes="(max-width: 600px) 400px, (max-width: 1024px) 800px, 1200px"
                    alt="${item.name || 'Hình ảnh nhà hàng'}" class="w-full h-40 sm:h-48 object-cover">
                <div class="p-3 sm:p-4 flex flex-col flex-grow">
                    <h3 class="text-md sm:text-lg font-semibold text-orange-600 mb-1 sm:mb-2">${item.name || 'Tên nhà hàng không xác định'}</h3>
                    <div class="flex-grow text-xs sm:text-sm">
                        ${item.address ? `<p class="text-gray-600 mb-1 mobile-address-truncate"><i class="fa-solid fa-map-marker-alt mr-1 sm:mr-2 text-gray-400"></i>${item.address}</p>` : ''}
                        ${item.cuisine ? `<p class="text-gray-600 mb-2 mobile-hideable"><i class="fa-solid fa-tags mr-1 sm:mr-2 text-gray-400"></i>${item.cuisine}</p>` : ''}
                    </div>
                    <a href="${item.mapLink || item.maplink || '#'}" target="_blank" rel="noopener noreferrer" class="inline-block bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-medium py-1.5 px-3 sm:py-2 sm:px-4 rounded-md transition duration-150 self-start mt-auto">
                        Xem trên bản đồ
                    </a>
                </div>
            </div>`;
    }

    function renderSpecialtyCard(item) {
        return `
            <div class="specialty-card border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
                <img loading="lazy" height="192" 
                    src="${item.image ? item.image : '../../assets/images/gallery/placeholder-4-800.webp'}"
                    srcset="${item.image ? '' : '../../assets/images/gallery/placeholder-4-400.webp 400w, ../../assets/images/gallery/placeholder-4-800.webp 800w, ../../assets/images/gallery/placeholder-4-1200.webp 1200w'}"
                    sizes="(max-width: 600px) 400px, (max-width: 1024px) 800px, 1200px"
                    alt="${item.name || 'Hình ảnh đặc sản'}" class="w-full h-40 sm:h-48 object-cover">
                <div class="p-3 sm:p-4 flex flex-col flex-grow">
                    <h3 class="text-md sm:text-lg font-semibold text-lime-600 mb-1 sm:mb-2">${item.name || 'Tên đặc sản không xác định'}</h3>
                    <p class="text-xs sm:text-sm text-gray-600 mb-2 flex-grow mobile-description-truncate">${item.description || 'Không có mô tả.'}</p>
                    ${item.purchaseLocation ? `<p class="text-xs text-gray-500 mt-auto mobile-hideable"><i class="fa-solid fa-store mr-1 sm:mr-2 text-gray-400"></i>${item.purchaseLocation}</p>` : ''}
                </div>
            </div>`;
    }

    // Xử lý thay đổi kích thước cửa sổ
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const oldItemsPerPage = ITEMS_PER_PAGE;
            updateItemsPerPage();
            if (oldItemsPerPage !== ITEMS_PER_PAGE) {
                renderSection('tours', 'Tours', renderTourCard, 1);
                renderSection('accommodations', 'Accommodations', renderAccommodationCard, 1);
                renderSection('restaurants', 'Restaurants', renderRestaurantCard, 1);
                renderSection('specialties', 'Specialties', renderSpecialtyCard, 1);
            }
        }, 250);
    });

    // Hàm khởi tạo chính
    async function initializeGuidePage() {
        // Tải và render mỗi section. Chúng sẽ tự động tải toàn bộ dữ liệu nếu chưa có trong cache/store.
        // Chúng ta có thể tải song song
        Promise.all([
            renderSection('tours', 'Tours', renderTourCard),
            renderSection('accommodations', 'Accommodations', renderAccommodationCard),
            renderSection('restaurants', 'Restaurants', renderRestaurantCard),
            renderSection('specialties', 'Specialties', renderSpecialtyCard)
        ]).then(() => {
        }).catch(error => {
            console.error("Error initializing one or more sections:", error);
        });
    }

    initializeGuidePage(); // Bắt đầu!
});
