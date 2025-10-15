// DOM Elements
const articlesContainer = document.getElementById('articles-container');
const articleCount = document.getElementById('article-count');
const searchInput = document.getElementById('search-input');
const mobileSearchInput = document.getElementById('mobile-search-input');
const searchResults = document.getElementById('search-results');
const searchResultsList = document.getElementById('search-results-list');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const closeMenuButton = document.getElementById('close-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const backToTopButton = document.getElementById('back-to-top');
const filterButtons = document.querySelectorAll('.filter-btn');
const contactForm = document.getElementById('contact-form');

// Initialize AOS
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });
    
    // Render articles
    renderArticles(articles);
    
    // Update article count
    articleCount.textContent = articles.length;
    
    // Initialize event listeners
    initEventListeners();
});

// Render articles
function renderArticles(articlesToRender) {
    articlesContainer.innerHTML = '';
    
    if (articlesToRender.length === 0) {
        articlesContainer.innerHTML = `
            <div class="col-span-1 bg-white rounded-lg shadow-card p-6 text-center">
                <p class="text-gray-500">No articles found.</p>
            </div>
        `;
        return;
    }
    
    articlesToRender.forEach((article, index) => {
        const articleCard = document.createElement('div');
        articleCard.className = 'article-card bg-white rounded-lg shadow-card hover:shadow-card-hover overflow-hidden';
        articleCard.setAttribute('data-aos', 'fade-up');
        articleCard.setAttribute('data-aos-delay', (index % 3) * 100);
        
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
        
        articleCard.innerHTML = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-3">
                    <span class="px-2 py-1 ${categoryColor} rounded-full text-xs font-medium">${getCategoryName(article.category)}</span>
                    <span class="text-gray-500 text-sm">${formatDate(article.date)}</span>
                </div>
                <h3 class="text-xl font-bold mb-2 text-gray-800">${article.title}</h3>
                <p class="text-gray-600 mb-4">${article.excerpt}</p>
                <a href="article-pages/${article.slug}.html" class="text-primary hover:text-blue-700 font-medium flex items-center">
                    Read more <i class="fa fa-arrow-right ml-2"></i>
                </a>
            </div>
        `;
        
        articlesContainer.appendChild(articleCard);
    });
}

// Search articles
function searchArticles(query) {
    if (!query.trim()) {
        hideSearchResults();
        return;
    }
    
    query = query.toLowerCase();
    
    const results = articles.filter(article => 
        article.title.toLowerCase().includes(query) || 
        article.excerpt.toLowerCase().includes(query) || 
        article.content.toLowerCase().includes(query)
    );
    
    showSearchResults(results, query);
}

// Show search results
function showSearchResults(results, query) {
    searchResultsList.innerHTML = '';
    
    if (results.length === 0) {
        searchResultsList.innerHTML = `
            <div class="py-4 text-gray-500">
                No results found for "${query}".
            </div>
        `;
    } else {
        results.forEach(article => {
            const resultItem = document.createElement('div');
            resultItem.className = 'py-3 border-b border-gray-100 hover:bg-gray-50';
            
            // Highlight search query in title
            const highlightedTitle = article.title.replace(
                new RegExp(`(${query})`, 'gi'),
                '<span class="highlight">$1</span>'
            );
            
            resultItem.innerHTML = `
                <a href="article-pages/${article.slug}.html" class="block search-result-link">
                    <h4 class="font-medium text-gray-800 mb-1">${highlightedTitle}</h4>
                    <p class="text-sm text-gray-500">${formatDate(article.date)} • ${getCategoryName(article.category)}</p>
                </a>
            `;
            
            searchResultsList.appendChild(resultItem);
        });
    }
    
    // Show search results dropdown
    searchResults.classList.remove('hidden');
    searchResults.classList.add('block');
}

// Hide search results
function hideSearchResults() {
    searchResults.classList.remove('block');
    searchResults.classList.add('hidden');
}

// Filter articles by category
function filterArticles(category) {
    if (category === 'all') {
        renderArticles(articles);
        articleCount.textContent = articles.length;
    } else {
        const filteredArticles = articles.filter(article => article.category === category);
        renderArticles(filteredArticles);
        articleCount.textContent = filteredArticles.length;
    }
    
    // Update active filter button
    filterButtons.forEach(button => {
        if (button.getAttribute('data-filter') === category) {
            button.classList.add('active', 'bg-primary', 'text-white');
            button.classList.remove('bg-gray-200', 'text-gray-700');
        } else {
            button.classList.remove('active', 'bg-primary', 'text-white');
            button.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
}

// Initialize event listeners
function initEventListeners() {
    // Search input event listeners
    searchInput.addEventListener('input', (e) => {
        searchArticles(e.target.value);
    });
    
    mobileSearchInput.addEventListener('input', (e) => {
        searchArticles(e.target.value);
        // Sync desktop search input with mobile
        searchInput.value = e.target.value;
    });
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !mobileSearchInput.contains(e.target) && !searchResults.contains(e.target)) {
            hideSearchResults();
        }
    });
    
    // Mobile menu toggle
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.add('open');
    });
    
    closeMenuButton.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
    });
    
    // Close mobile menu when clicking a link
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
        });
    });
    
    // Back to top button
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopButton.classList.remove('opacity-0', 'invisible');
            backToTopButton.classList.add('opacity-100', 'visible');
        } else {
            backToTopButton.classList.add('opacity-0', 'invisible');
            backToTopButton.classList.remove('opacity-100', 'visible');
        }
    });
    
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-filter');
            filterArticles(category);
        });
    });
    
    // Contact form submission
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        
        // Validate form
        if (!name || !email || !message) {
            alert('Please fill in all fields.');
            return;
        }
        
        // Simulate form submission
        alert('Thank you for your message! I will get back to you soon.');
        contactForm.reset();
    });
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to get category name
function getCategoryName(categorySlug) {
    const categories = {
        'machine-learning': 'Machine Learning',
        'nlp': 'Natural Language Processing',
        'computer-vision': 'Computer Vision',
        'programming': 'Programming'
    };
    
    return categories[categorySlug] || categorySlug;
}

// Sample articles data
const articles = [
    {
        id: 1,
        slug: 'understanding-transformers',
        title: 'Understanding Transformers',
        category: 'machine-learning',
        date: '2025-07-15',
        excerpt: 'A comprehensive guide to understanding the Transformer architecture and its applications in natural language processing.',
        content: 'The Transformer architecture has revolutionized natural language processing. In this article, we\'ll dive deep into how Transformers work, their key components like self-attention, and how they\'ve been applied in models like BERT, GPT, and T5.'
    },
    {
        id: 2,
        slug: 'introduction-to-reinforcement-learning',
        title: 'Introduction to Reinforcement Learning',
        category: 'machine-learning',
        date: '2025-07-10',
        excerpt: 'Learn the basics of reinforcement learning, including Markov decision processes, Q-learning, and policy gradients.',
        content: 'Reinforcement learning is a type of machine learning where an agent learns to make decisions by interacting with an environment. This article covers the fundamental concepts, algorithms, and applications of RL.'
    },
    {
        id: 3,
        slug: 'bert-pre-training',
        title: 'BERT: Pre-training of Deep Bidirectional Transformers',
        category: 'nlp',
        date: '2025-07-05',
        excerpt: 'An in-depth look at BERT, the revolutionary pre-training technique that changed the NLP landscape.',
        content: 'BERT (Bidirectional Encoder Representations from Transformers) introduced a new approach to pre-training language models. This article explores how BERT works, its architecture, and how it\'s fine-tuned for various NLP tasks.'
    },
    {
        id: 4,
        slug: 'image-classification-with-cnns',
        title: 'Image Classification with Convolutional Neural Networks',
        category: 'computer-vision',
        date: '2025-06-28',
        excerpt: 'Discover how CNNs revolutionize image classification tasks and learn how to implement a basic CNN model.',
        content: 'Convolutional Neural Networks (CNNs) have become the gold standard for image classification tasks. This article explains the architecture of CNNs, key components like convolutional layers and pooling, and how to implement a simple CNN for image classification.'
    },
    {
        id: 5,
        slug: 'python-for-data-science',
        title: 'Python for Data Science: Essential Libraries',
        category: 'programming',
        date: '2025-06-20',
        excerpt: 'A overview of the most important Python libraries for data science, including NumPy, Pandas, and Matplotlib.',
        content: 'Python has become the go-to language for data science. This article covers the essential libraries that every data scientist should know, including how to use NumPy for numerical computing, Pandas for data manipulation, and Matplotlib for data visualization.'
    },
    {
        id: 6,
        slug: 'generative-adversarial-networks',
        title: 'Generative Adversarial Networks Explained',
        category: 'machine-learning',
        date: '2025-06-15',
        excerpt: 'Learn about GANs, a powerful framework for generating realistic synthetic data.',
        content: 'Generative Adversarial Networks (GANs) consist of two neural networks, a generator and a discriminator, that are trained simultaneously. This article explains how GANs work, different GAN architectures, and their applications in image generation, style transfer, and more.'
    },
    {
        id: 7,
        slug: 'nlp-with-transformers',
        title: 'Natural Language Processing with Transformers',
        category: 'nlp',
        date: '2025-06-10',
        excerpt: 'Explore how Transformers have transformed NLP tasks like machine translation, text summarization, and question answering.',
        content: 'Transformers have revolutionized natural language processing by enabling models to capture long-range dependencies in text. This article discusses how Transformers are used in various NLP tasks, including machine translation, text summarization, question answering, and more.'
    },
    {
        id: 8,
        slug: 'object-detection-with-yolo',
        title: 'Object Detection with YOLO',
        category: 'computer-vision',
        date: '2025-06-05',
        excerpt: 'An introduction to YOLO (You Only Look Once), a state-of the art object detection algorithm.',
        content: 'YOLO (You Only Look Once) is a real-time object detection system that processes images in a single pass. This article explains how YOLO works, its architecture, and how it compares to other object detection algorithms like R-CNN and SSD.'
    },
    {
        id: 9,
        slug: 'deep-learning-for-time-series',
        title: 'Deep Learning for Time Series Forecasting',
        category: 'machine-learning',
        date: '2025-05-28',
        excerpt: 'Learn how deep learning models like LSTMs and Transformers can be used for time series forecasting.',
        content: 'Time series forecasting is a challenging task that has applications in finance, weather prediction, and many other fields. This article explores how deep learning models like LSTMs, GRUs, and Transformers can be used to improve time series forecasting accuracy.'
    },
    {
        id: 10,
        slug: 'web-scraping-with-python',
        title: 'Web Scraping with Python',
        category: 'programming',
        date: '2025-05-20',
        excerpt: 'A tutorial on how to extract data from websites using Python libraries like Beautiful Soup and Scrapy.',
        content: 'Web scraping is a powerful technique for extracting data from websites. This article covers the basics of web scraping with Python, including how to use libraries like Beautiful Soup for parsing HTML and Scrapy for building more complex scrapers.'
    }
];
