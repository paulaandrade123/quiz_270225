document.addEventListener("DOMContentLoaded", function () {
    var map = L.map("map").setView([4.6985, -74.1173], 15);
    var trees = []; // Guardará los árboles cargados

    // Capa base de OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Polígono de Álamos Norte
    var alamosNortePolygon = [
        [4.7018, -74.1205],
        [4.7018, -74.1140],
        [4.6945, -74.1140],
        [4.6945, -74.1205]
    ];

    L.polygon(alamosNortePolygon, {
        color: "red",
        weight: 2,
        fillColor: "rgba(255, 0, 0, 0.3)",
        fillOpacity: 0.4
    }).addTo(map).bindPopup("🗺️ Barrio Álamos Norte");

    // Función para leer el Shapefile
    document.getElementById("fileInput").addEventListener("change", function (event) {
        var files = event.target.files;
        var shpFile, dbfFile;

        for (let file of files) {
            if (file.name.endsWith(".shp")) shpFile = file;
            if (file.name.endsWith(".dbf")) dbfFile = file;
        }

        if (shpFile && dbfFile) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var shpBuffer = e.target.result;
                var dbfReader = new FileReader();

                dbfReader.onload = function (e) {
                    var dbfBuffer = e.target.result;
                    loadShapefile(shpBuffer, dbfBuffer);
                };

                dbfReader.readAsArrayBuffer(dbfFile);
            };

            reader.readAsArrayBuffer(shpFile);
        } else {
            alert("Sube ambos archivos: .shp y .dbf");
        }
    });

    function loadShapefile(shpBuffer, dbfBuffer) {
        shapefile.open(shpBuffer, dbfBuffer)
            .then(source => source.read()
                .then(function log(result) {
                    if (result.done) return;

                    var feature = {
                        type: "Feature",
                        geometry: result.value.geometry,
                        properties: result.value.properties
                    };

                    var coords = feature.geometry.coordinates;
                    if (feature.geometry.type === "Point") {
                        var latlng = [coords[1], coords[0]];

                        // Verificar si está dentro del barrio
                        if (L.polygon(alamosNortePolygon).getBounds().contains(latlng)) {
                            trees.push({ lat: coords[1], lon: coords[0], especie: feature.properties.especie });

                            L.circleMarker(latlng, {
                                radius: 6,
                                fillColor: "#228B22",
                                color: "#006400",
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            }).addTo(map).bindPopup("🌳 Especie: " + feature.properties.especie);
                        }
                    }
                    return source.read().then(log);
                })
            ).catch(error => console.error(error));
    }

    // Función para calcular distancia entre dos puntos (Fórmula de Haversine)
    function haversine(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radio de la Tierra en km
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distancia en km
    }

    // Función para generar el PDF con las distancias
    document.getElementById("generatePDF").addEventListener("click", function () {
        if (trees.length < 2) {
            alert("Debe haber al menos dos árboles para calcular distancias.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text("Distancias entre Árboles", 10, 10);
        doc.setFontSize(12);

        let y = 20;
        for (let i = 0; i < trees.length; i++) {
            for (let j = i + 1; j < trees.length; j++) {
                let distancia = haversine(trees[i].lat, trees[i].lon, trees[j].lat, trees[j].lon);
                doc.text(`De ${trees[i].especie} a ${trees[j].especie}: ${distancia.toFixed(2)} km`, 10, y);
                y += 7;
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            }
        }

        doc.save("distancias_arboles.pdf");
    });
});
