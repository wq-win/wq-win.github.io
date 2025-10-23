// Article page specific JavaScript

// DOM Elements
const articleTitle = document.getElementById('article-title');
const articleHeader = document.querySelector('.article-header');
const articleBody = document.querySelector('.article-body');
const relatedArticlesList = document.querySelector('.related-articles-list');

// Initialize AOS
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });
    
    // Load article content
    loadArticleContent();
    
    // Render related articles
    renderRelatedArticles();
});

// Load article content based on URL
function loadArticleContent() {
    // Get current article slug from URL
    const currentPath = window.location.pathname;
    const currentSlug = currentPath.split('/').pop().replace('.html', '');
    
    // Find current article
    const currentArticle = articles.find(article => article.slug === currentSlug);
    
    if (!currentArticle) {
        // If article not found, display error message
        articleHeader.innerHTML = `
            <div class="flex flex-wrap items-center gap-2 mb-4">
                <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Error</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold mb-4 text-gray-800">Article Not Found</h1>
        `;
        
        articleBody.innerHTML = `
            <p>The article you're looking for could not be found. Please check the URL or return to the <a href="../index.html" class="text-primary hover:underline">home page</a>.</p>
        `;
        
        return;
    }
    
    // Update page title
    articleTitle.textContent = `${currentArticle.title} | MyLog`;
    
    // Determine category badge color
    let categoryColor = '';
    switch(currentArticle.category) {
        case 'machine-learning':
            categoryColor = 'bg-blue-100 text-blue-800';
            break;
        case 'nlp':
            categoryColor = 'bg-purple-100 text-purple-800';
            break;
        case 'computer-vision':
            categoryColor = 'bg-green-100 text-green-800';
            break;
        case 'programming':
            categoryColor = 'bg-yellow-100 text-yellow-800';
            break;
        default:
            categoryColor = 'bg-gray-100 text-gray-800';
    }
    
    // Update article header
    articleHeader.innerHTML = `
        <div class="flex-wrap items-center gap-2 mb-4">
            <span class="px-3 py-1 ${categoryColor} rounded-full text-sm font-medium">${getCategoryName(currentArticle.category)}</span>
            <span class="text-gray-500 text-sm">${formatDate(currentArticle.date)}</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-bold mb-4 text-gray-800">${currentArticle.title}</h1>
    `;
    
    // Update article body
    articleBody.innerHTML = `
        <p>${currentArticle.content}</p>
        
        <h2>Further Reading</h2>
        <p>Check out some of our other articles on related topics:</p>
        <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><a href="#" class="text-primary hover:underline">Getting Started with Machine Learning</a></li>
            <li><a href="#" class="text-primary hover:underline">Advanced Techniques in NLP</a></li>
            <li><a href="#" class="text-primary hover:underline">Future Trends in AI</a></li>
        </ul>
    `;
}

// Render related articles
function renderRelatedArticles() {
    // Get current article slug from URL
    const currentPath = window.location.pathname;
    const currentSlug = currentPath.split('/').pop().replace('.html', '');
    
    // Find current article
    const currentArticle = articles.find(article => article.slug === currentSlug);
    
    if (!currentArticle) return;
    
    // Get related articles
    const relatedArticlesIds = getRelatedArticleIds(currentArticle.id, currentArticle.category);
    const relatedArticles = articles.filter(article => relatedArticleIds.includes(article.id));
    
    // Render related articles
    relatedArticlesList.innerHTML = '';
    
    relatedArticles.forEach(article => {
        // Determine category badge color
        let categoryColor = '';
        switch(article.category) {
            case 'machine-learning':
                categoryColor = 'bg-blue-100 text-blue-800';
                break;
            case 'nlp':
                categoryColor = 'bg-purple-100 text-purple-800';
                break;
            case 'computer-vision':
                categoryColor = 'bg-green-100 text-green-800';
                break;
            case 'programming':
                categoryColor = 'bg-yellow-100 text-yellow-800';
                break;
            default:
                categoryColor = 'bg-gray-100 text-gray-800';
        }
        
        const articleCard = document.createElement('div');
        articleCard.className = 'bg-white rounded-lg shadow-card overflow-hidden';
        
        articleCard.innerHTML = `
            <div class="p-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="px-2 py-1 ${categoryColor} rounded-full text-xs font-medium">${getCategoryName(article.category)}</span>
                    <span class="text-gray-500 text-xs">${formatDate(article.date)}</span>
                </div>
                <h4 class="text-lg font-bold mb-2 text-gray-800">${article.title}</h4>
                <p class="text-gray-600 mb-3 text-sm line-clamp-2">${article.excerpt}</p>
                <a href="${article.slug}.html" class="text-primary hover:text-blue-700 font-medium flex items-center text-sm">
                    Read more <i class="fa fa-arrow-right ml-1"></i>
                </a>
            </div>
        `;
        
        relatedArticlesList.appendChild(articleCard);
    });
}

// Get related article IDs
function getRelatedArticleIds(currentArticleId, category) {
    // Filter out the current article and get articles from the same category
    const sameCategoryArticles = articles
        .filter(article => article.id !== currentArticleId && article.category === category)
        .slice(0, 3);
    
    // If there are not enough articles from the same category, add articles from other categories
    if (sameCategoryArticles.length < 3) {
        const otherArticles = articles
            .filter(article => article.id !== currentArticleId && article.category !== category)
            .slice(0, 3 - sameCategoryArticles.length);
        
        return [...sameCategoryArticles, ...otherArticles].map(article => article.id);
    }
    
    return sameCategoryArticles.map(article => article.id);
}
