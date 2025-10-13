// 平滑滚动（点击导航链接时）
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// 页面加载完成后的简单动画效果
window.addEventListener('load', () => {
    const articles = document.querySelectorAll('.article-card');
    articles.forEach((article, index) => {
        setTimeout(() => {
            article.style.opacity = '1';
            article.style.transform = 'translateY(0)';
        }, 100 * index);
    });
});
