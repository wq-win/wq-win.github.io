# MyLog - Personal Blog

A personal blog website inspired by Lilian Weng's blog, built with HTML, CSS, JavaScript, and Tailwind CSS.

## Features

- Clean and minimalist design with left sidebar layout
- Responsive design that works on mobile, tablet, and desktop
- Article cards with hover effects
- Category filtering
- Search functionality
- Individual article pages with related articles
- Smooth animations using AOS (Animate On Scroll)

## Project Structure

```
personal-blog/
├── index.html              # Main page with article listings
├── test.html               # Test page for verifying functionality
├── css/
│   └── style.css           # Custom CSS styles
├── js/
│   ├── main.js             # Main JavaScript functionality
│   └── article.js          # Article page specific functionality
└── article-pages/          # Individual article pages
    ├── understanding-transformers.html
    ├── introduction-to-reinforcement-learning.html
    ├── bert-pre-training.html
    ├── image-classification-with-cnns.html
    ├── python-for-data-science.html
    ├── generative-adversarial-networks.html
    ├── nlp-with-transformers.html
    ├── object-detection-with-yolo.html
    ├── deep-learning-for-time-series.html
    └── web-scraping-with-python.html
```

## How to Use

1. Clone the repository
2. Open `index.html` in a web browser
3. Browse articles, use search, or filter by category
4. Click "Read more" to view individual articles

## Customization

### Adding New Articles

1. Create a new HTML file in the `article-pages` directory using the slug format (e.g., `new-article.html`)
2. Copy the content from `simple-article.html` as a template
3. Add the new article data to the `articles` array in `js/main.js` with the correct slug

### Modifying Styles

- Customize Tailwind CSS colors and fonts in the `tailwind.config` object in `index.html` and article pages
- Add custom styles in `css/style.css`

### Changing Layout

- Modify the grid layout in `index.html` by changing the `grid-cols` class in the articles container
- Adjust the left sidebar width by changing the `md:w-1/4` class in the main content sections

## Dependencies

- Tailwind CSS v3
- Font Awesome
- AOS (Animate On Scroll)

## License

MIT
