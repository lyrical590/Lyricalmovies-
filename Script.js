const baseUrl = 'https://movieapi.giftedtech.co.ke';
let currentPage = 1;
let currentQuery = '';
let hasMore = false;
let currentGenre = '';
const useHash = !window.location.origin.includes('localhost') && !window.location.protocol.startsWith('http'); // Use hash for local files

// Router: Parse URL and load appropriate view
function router() {
    const path = useHash ? window.location.hash.slice(1) : window.location.pathname;
    const [route, param] = path.split('/').slice(1);
    
    if (route === 'movie' && param) {
        showDetails(param);
    } else if (route === 'search' && param) {
        currentQuery = decodeURIComponent(param);
        fetchResults(currentQuery, 1);
    } else if (route === 'genre' && param) {
        showPage(param);
    } else {
        showPage('home');
    }
}

// Navigate to a new route
function navigate(path) {
    if (useHash) {
        window.location.hash = path;
    } else {
        history.pushState(null, '', path);
    }
    router();
}

// Handle back/forward
window.addEventListener('popstate', router);
window.addEventListener('hashchange', router);

// Load initial route
window.onload = router;

function showPage(genre) {
    currentGenre = genre;
    document.getElementById('results').classList.add('hidden');
    document.getElementById('load-more').classList.add('hidden');
    document.getElementById('details').classList.add('hidden');
    document.getElementById('suggestions').classList.remove('hidden');
    document.getElementById('page-title').textContent = genre.charAt(0).toUpperCase() + genre.slice(1) + ' Movies';
    fetchSuggestions();
}

function fetchSuggestions() {
    document.getElementById('suggestions').innerHTML = '<div class="loading">Loading...</div>';
    fetch(`${baseUrl}/api/search/trending?page=1`)
        .then(response => response.json())
        .then(data => {
            displaySuggestions(data.results.items.slice(0, 25));
        })
        .catch(() => {
            fetch(`${baseUrl}/api/search/popular?page=1`)
                .then(response => response.json())
                .then(data => {
                    displaySuggestions(data.results.items.slice(0, 25));
                })
                .catch(() => {
                    fetch(`${baseUrl}/api/search/action?page=1`)
                        .then(response => response.json())
                        .then(data => {
                            displaySuggestions(data.results.items.slice(0, 25));
                        });
                });
        });
}

function displaySuggestions(items) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => navigate(`/movie/${item.subjectId}`);
        card.innerHTML = `
            <img src="${item.cover.url}" alt="${item.title}">
            <h3>${item.title}</h3>
            <p>${item.releaseDate} | ${item.genre}</p>
        `;
        suggestionsDiv.appendChild(card);
    });
}

function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    navigate(`/search/${encodeURIComponent(query)}`);
}

function fetchResults(query, page) {
    document.getElementById('suggestions').classList.add('hidden');
    document.getElementById('details').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('results').innerHTML = '<div class="loading">Loading...</div>';
    fetch(`${baseUrl}/api/search/${encodeURIComponent(query)}?page=${page}`)
        .then(response => response.json())
        .then(data => {
            if (page === 1) {
                document.getElementById('results').innerHTML = '';
            }
            displayResults(data.results.items);
            hasMore = data.results.pager.hasMore;
            document.getElementById('load-more').classList.toggle('hidden', !hasMore);
            // If only one result, auto-navigate to it
            if (data.results.items.length === 1) {
                navigate(`/movie/${data.results.items[0].subjectId}`);
            }
        })
        .catch(() => alert('Error loading search results.'));
}

function displayResults(items) {
    const resultsDiv = document.getElementById('results');
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => navigate(`/movie/${item.subjectId}`);
        card.innerHTML = `
            <img src="${item.cover.url}" alt="${item.title}">
            <h3>${item.title}</h3>
            <p>${item.releaseDate} | ${item.genre}</p>
        `;
        resultsDiv.appendChild(card);
    });
}

function loadMore() {
    currentPage++;
    fetchResults(currentQuery, currentPage);
}

function showDetails(id) {
    document.getElementById('suggestions').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('load-more').classList.add('hidden');
    document.getElementById('details').classList.remove('hidden');
    document.getElementById('details').innerHTML = '<div class="loading">Loading...</div>';
    
    fetch(`${baseUrl}/api/info/${id}`)
        .then(response => response.json())
        .then(data => {
            const subject = data.results.subject;
            const stars = data.results.stars;
            
            let detailsHtml = `
                <button onclick="navigate('/')">Back</button>
                <img src="${subject.cover.url}" alt="${subject.title}">
                <h2>${subject.title}</h2>
                <p><strong>Description:</strong> ${subject.description}</p>
                <p><strong>Release Date:</strong> ${subject.releaseDate}</p>
                <p><strong>Genre:</strong> ${subject.genre}</p>
                <p><strong>IMDB Rating:</strong> ${subject.imdbRatingValue} (${subject.imdbRatingCount} votes)</p>
                <p><strong>Country:</strong> ${subject.countryName}</p>
                <p><strong>Duration:</strong> ${Math.floor(subject.duration / 60)} minutes</p>
                <div class="cast">
                    <h3>Cast:</h3>
                    ${stars.slice(0, 10).map(star => `<img src="${star.avatarUrl}" alt="${star.name}" title="${star.name} as ${star.character}">`).join('')}
                </div>
                <div class="trailer">
                    <button onclick="showTrailer('${subject.title}')">Watch Trailer</button>
                </div>
                <div class="downloads">
                    <h3>Stream & Download:</h3>
            `;
            
            if (subject.subjectType === 1) { // Movie
                fetch(`${baseUrl}/api/sources/${id}`)
                    .then(response => response.json())
                    .then(sources => {
                        sources.results.forEach(source => {
                            detailsHtml += `
                                <a href="${source.download_url}" download>Download ${source.quality} (${(source.size / 1024 / 1024 / 1024).toFixed(2)} GB)</a>
                                <button onclick="streamMovie('${source.download_url}')">Stream ${source.quality}</button>
                            `;
                        });
                        detailsHtml += '</div>';
                        document.getElementById('details').innerHTML = detailsHtml;
                    })
                    .catch(() => alert('Error loading sources.'));
            } else { // TV Series - Allow downloading all episodes
                detailsHtml += `
                    <label for="season">Season:</label>
                    <select id="season" onchange="loadEpisodes(${id})">
                        ${Array.from({length: 10}, (_, i) => `<option value="${i+1}">Season ${i+1}</option>`).join('')}
                    </select>
                    <button onclick="downloadAllEpisodes(${id})">Download All Episodes in This Season</button>
                    <div id="episode-list" class="episode-list"></div>
                `;
                detailsHtml += '</div>';
                document.getElementById('details').innerHTML = detailsHtml;
                document.getElementById('details').classList.remove('hidden');
                loadEpisodes(id); // Load episodes for default season 1
            }
        })
        .catch(() => alert('Error loading details.'));
}

function loadEpisodes(id) {
    const season = document.getElementById('season').value;
    const episodeListDiv = document.getElementById('episode-list');
    episodeListDiv.innerHTML = '<p>Loading episodes...</p>';
    
    let episodesHtml = '';
    // Assume up to 24 episodes per season; fetch each one
    for (let episode = 1; episode <= 24; episode++) {
        fetch(`${baseUrl}/api/sources/${id}?season=${season}&episode=${episode}`)
            .then(response => response.json())
            .then(sources => {
                if (sources.results && sources.results.length > 0) {
                    episodesHtml += `<div class="episode-item"><h4>Episode ${episode}</h4>`;
                    sources.results.forEach(source => {
                        episodesHtml += `
                            <a href="${source.download_url}" download>Download ${source.quality} (${(source.size / 1024 / 1024 / 1024).toFixed(2)} GB)</a>
                            <button onclick="streamMovie('${source.download_url}')">Stream ${source.quality}</button>
                        `;
                    });
                    episodesHtml += '</div>';
                }
                // Update the list after each fetch (simple way; could optimize)
                episodeListDiv.innerHTML = episodesHtml || '<p>No episodes found.</p>';
            })
            .catch(() => {}); // Skip missing episodes
    }
}

function downloadAllEpisodes(id) {
    const season = document.getElementById('season').value;
    for (let episode = 1; episode <= 24; episode++) {
        fetch(`${baseUrl}/api/sources/${id}?season=${
