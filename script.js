let map;
let markers = [];
let markerMap = new Map();  // Map para rastrear as coordenadas dos marcadores
const maxMarkers = 100;  // Limite de marcações
const loadedAreas = new Set();  // Guardar áreas já carregadas

// Coordenadas primárias
const defaultLat = -15.8030;
const defaultLon = -47.9007;

// Função para expandir e recolher o menu
const menuIcon = document.getElementById('menuIcon');
const menu = document.getElementById('menu');

menuIcon.addEventListener('click', () => {
    menu.classList.toggle('show'); // Alterna entre exibir e ocultar o menu
});


// Função para inicializar o mapa
function initMap(lat, lon) {
    if (!map) {
        map = L.map('map', {
            center: [lat, lon],
            zoom: 17,
            minZoom: 3,  // Ajuste este valor conforme desejado
            maxZoom: 18  // Ajuste este valor conforme desejado
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Carregar pontos turísticos ao mover o mapa
        map.on('moveend', loadTouristSpots);
    } else {
        map.setView([lat, lon], 13);
    }
}


// Função para calcular o raio de busca (20 km)
function calculateRadius() {
    return 10000;  // Raio de 20 km
}

// Função para calcular um identificador da área visível
function getVisibleAreaKey() {
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    return `${ne.lat},${ne.lng},${sw.lat},${sw.lng}`;
}

// Função para verificar se um marcador já existe nessas coordenadas
function markerExists(lat, lon) {
    const key = `${lat},${lon}`;
    return markerMap.has(key);
}

// Função para adicionar um novo marcador, garantindo que não haja duplicatas
function addMarker(lat, lon, name) {
    const key = `${lat},${lon}`;
    if (!markerMap.has(key)) {
        const marker = L.marker([lat, lon]).addTo(map)
            .bindPopup(`<b>${name}</b>`)
            .on('click', () => {
                fetchTouristInfo(name); // Buscar informações detalhadas ao clicar
            });
        markers.push(marker);
        markerMap.set(key, marker);  // Armazena o marcador no mapa de coordenadas
    }
}

// Função para remover os marcadores que estão fora da área visível
function removeMarkersOutsideView() {
    const bounds = map.getBounds();  // Limites visíveis do mapa

    markers = markers.filter(marker => {
        const markerLatLng = marker.getLatLng();
        if (!bounds.contains(markerLatLng)) {
            map.removeLayer(marker);  // Remove o marcador do mapa
            const key = `${markerLatLng.lat},${markerLatLng.lng}`;
            markerMap.delete(key);  // Remove do Map
            return false;  // Remove da lista de marcadores
        }
        return true;  // Mantém o marcador se estiver dentro da tela
    });
}

// Função para buscar pontos turísticos da Wikipédia
function loadTouristSpots() {
    const center = map.getCenter();
    const lat = center.lat;
    const lon = center.lng;
    
    const radius = calculateRadius();
    const visibleAreaKey = getVisibleAreaKey();  // Obtém a área visível atual

    // Se a área já foi carregada, não faça a requisição novamente
    if (loadedAreas.has(visibleAreaKey)) {
        return;
    }

    // Adiciona a área atual à lista de áreas carregadas
    loadedAreas.add(visibleAreaKey);

    const selectedTypes = Array.from(document.querySelectorAll('#filterOptions input:checked'))
        .map(checkbox => checkbox.value);

    // Construir o URL de busca com base nos tipos selecionados
    const typesQuery = selectedTypes.length ? `&types=${selectedTypes.join(',')}` : '';

    // Buscar pontos turísticos próximos à nova área
    fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=${maxMarkers}&format=json&origin=*`)
        .then(response => response.json())
        .then(data => {
            if (data.query && data.query.geosearch.length > 0) {
                const places = data.query.geosearch.map(place => ({
                    lat: place.lat,
                    lon: place.lon,
                    name: place.title
                }));

                // Adiciona novos marcadores, evitando duplicatas
                places.forEach(place => {
                    addMarker(place.lat, place.lon, place.name);
                });

                // Remover marcadores que saíram da área visível
                removeMarkersOutsideView();
            } else {
                console.log('Nenhum ponto turístico encontrado na área.');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar os pontos turísticos:', error);
        });
}

// Função para buscar e redirecionar para o endereço pesquisado
function searchAddress() {
    const address = document.getElementById('search').value;
    if (address) {
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lat = data[0].lat;
                    const lon = data[0].lon;

                    // Centraliza o mapa e carrega novos pontos turísticos
                    if (map) {
                        map.setView([lat, lon], 13);
                        loadTouristSpots(); // Carrega pontos turísticos da nova área
                    }
                } else {
                    alert('Endereço não encontrado.');
                }
            })
            .catch(error => {
                console.error('Erro ao buscar o endereço:', error);
                alert('Falha ao buscar o endereço. Verifique sua conexão com a Internet.');
            });
    } else {
        alert('Por favor, insira um endereço.');
    }
}

// Adicionar evento ao botão de envio de imagem
document.getElementById('uploadButton').addEventListener('click', () => {
    const fileInput = document.getElementById('uploadImage');
    const file = fileInput.files[0];

    if (file) {
        const formData = new FormData();
        formData.append('image', file);

        // Substituir 'urlDoServidor' com o caminho da sua API para enviar a imagem
        fetch('urlDoServidor', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Imagem enviada com sucesso!');
                // Atualizar a imagem no modal, se necessário
                document.getElementById('modalImage').src = URL.createObjectURL(file);
            } else {
                alert('Falha ao enviar a imagem.');
            }
        })
        .catch(error => {
            console.error('Erro ao enviar a imagem:', error);
            alert('Erro ao enviar a imagem.');
        });
    } else {
        alert('Por favor, selecione uma imagem.');
    }
});


// Função para buscar informações da Wikipédia sobre o ponto turístico
function fetchTouristInfo(name) {
    fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&titles=${encodeURIComponent(name)}&format=json&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=500&origin=*`)
        .then(response => response.json())
        .then(data => {
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            const page = pages[pageId];

            const title = page.title;
            const description = page.extract || 'Descrição não disponível';
            const imageUrl = page.thumbnail ? page.thumbnail.source : 'https://i.ibb.co/5r954PK/6edf480b-c4ef-43d3-b558-366d23e.jpg';  // Imagem padrão se não houver uma disponível

            showInfoModal(title, description, imageUrl);
        })
        .catch(error => {
            console.error('Erro ao buscar informações do ponto turístico:', error);
        });
}

// Função para exibir o modal com informações sobre o ponto turístico
function showInfoModal(title, description, imageUrl) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDescription').innerText = description;
    document.getElementById('modalImage').src = imageUrl;

    const modal = document.getElementById('infoModal');
    modal.style.display = "block";

    // Fechar o modal ao clicar no botão de fechar
    document.querySelector('.modal .close').onclick = function() {
        modal.style.display = "none";
    };

    // Fechar o modal ao clicar fora da área do modal
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
}

window.onload = function() {
    const backgroundMusic = document.getElementById('backgroundMusic');
    backgroundMusic.volume = 0.2; // Ajuste o volume conforme necessário
    backgroundMusic.play();
};


// Adiciona um evento ao botão de pesquisa
document.getElementById('searchButton').addEventListener('click', searchAddress);

// Adiciona um evento para atualizar os pontos turísticos quando as caixas de seleção mudarem
document.querySelectorAll('#filterOptions input').forEach(checkbox => {
    checkbox.addEventListener('change', loadTouristSpots);
});

// Inicializando o mapa com as coordenadas fornecidas e pontos turísticos
initMap(defaultLat, defaultLon);
loadTouristSpots(); // Carregar pontos turísticos ao inicializar
