/**
 * Requires
 * - Leaflet: <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"
 *             integrity="sha512-XQoYMqMTK8LvdxXYG3nZ448hOEQiglfqkJs1NOQV44cWnUrBc8PkAOcXy20w0vlaXaVUearIOBhiXZ5V3ynxwA=="
 *             crossorigin="anonymous"></script>
 * - Leaflet-geoman (for control buttons):
 *             <script src="https://unpkg.com/@geoman-io/leaflet-geoman-free@latest/dist/leaflet-geoman.min.js"
 *             integrity="sha384-nKbugTwvdlM597uQWI7vPF0jEBd1IekNb16CPijHapeOFyqXmpvwYISwiZmyhg7m"
 *             crossorigin="anonymous"></script>
 * - Leaflet-geosearch (for search function):
 *              <script src="https://unpkg.com/leaflet-geosearch@3.3.2/dist/geosearch.umd.js"
 *             integrity="sha384-Uq80a0t9n6BA6vtncUS3TmlN2fAN/sTtyMUPxcHoWYyN3ady1FdqisXohEzMdGCR"
 *             crossorigin="anonymous"></script>
 */

/* global  L, GeoSearch */

const EARTH_RADIUS = 6371000;
const PI = 3.14159265359;
let mapContainer;

/**
 * Calculate the distance between two points (lon,lat-format) in metres using the Haversine formula
 *
 * @param pointA First point
 * @param pointB Second point
 * @returns Distance between both given points in metres
 */
function calculateDistance(pointA, pointB) {
    const latA = (pointA.lat * PI) / 180;
    const latB = (pointB.lat * PI) / 180;
    const lonA = (pointA.lng * PI) / 180;
    const lonB = (pointB.lng * PI) / 180;
    return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(Math.sin((latB - latA) / 2) ** 2
        + Math.cos(latA) * Math.cos(latB) * Math.sin((lonB - lonA) / 2) ** 2));
}

/**
 * Add a given height in metres to a given latitude value
 *
 * @param fixPoint Latitude value
 * @param height Height in metres to be added to the latitude value
 * @returns New latitude value
 */
function addToLat(fixPoint, height) {
    return (((fixPoint * PI) / 180 + height / EARTH_RADIUS) * 180) / PI;
}

/**
 * Add a given width in metres to a given longitude value
 *
 * @param fixPoint Longitude value
 * @param width Width in metres to be added to the longitude value
 * @param lat1 Latitude value from the same bbox as the given longitude value
 * @param lat2 Other lat. value from the same bbox (if you have only a point, use the same value
 *             for lat1 and lat2
 * @returns New longitude value
 */
function addToLon(fixPoint, width, lat1, lat2) {
    return (Math.asin(Math.sqrt((Math.sin(width / 2 / EARTH_RADIUS) ** 2)
        / (Math.cos((lat1 * PI) / 180) * Math.cos((lat2 * PI)
            / 180)))) * 2 + ((fixPoint * PI) / 180) * 180) / PI;
}

/**
 *  Get a new bbox based on a given one (same left top corner and same width/height), but with a
 *  given width-height-ratio
 *
 * @param ratio Width-height-ratio the new bbox should have
 * @param oldCoords Bbox on which the new bbox should be based
 * @returns Bbox similar to 'oldCoords', but with 'ratio' as width-height-ratio
 */
function getBbox(ratio, oldCoords) {
    const oldWidth = calculateDistance(oldCoords[1], oldCoords[2]);
    const oldHeight = calculateDistance(oldCoords[0], oldCoords[1]);
    const newCoords = [oldCoords[0], oldCoords[1], oldCoords[2], oldCoords[3]];
    if (oldWidth > oldHeight) {
        const height = ratio * oldWidth;
        const lat1 = oldCoords[0].lat;
        const lat2 = addToLat(lat1, height);
        newCoords[1].lat = lat2;
        newCoords[2].lat = lat2;
    } else {
        const width = ratio * oldHeight;
        const lon1 = oldCoords[0].lng;
        const lat1 = oldCoords[0].lat;
        const lat2 = oldCoords[2].lat;
        const lon2 = addToLon(lon1, width, lat1, lat2);
        newCoords[2].lng = lon2;
        newCoords[3].lng = lon2;
    }
    return newCoords;
}

/**
 * Initialize a leaflet map container to show a world map with OSM tiles and a corresponding
 * copyright notice. Add buttons for bbox selection and search
 */
function initMap() {
    mapContainer = L.map("map", { zoom: 16, center: [49.41071, 8.69260] });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
        noWrap: true,
    }).addTo(mapContainer);
    mapContainer.flyTo([0, 0], 1);

    mapContainer.pm.addControls({
        position: "topleft",
        drawMarker: false,
        drawCircleMarker: false,
        drawPolyline: false,
        drawPolygon: false,
        cutPolygon: false,
        drawCircle: false,
        rotateMode: false,
    });

    const leafletButtons = document.querySelectorAll(".leaflet-buttons-control-button");
    const texts = ["Draw bounding box", "Move points", "Move bounding box", "Remove bounding box"];
    for (let i = 0; i < texts.length; i++) {
        leafletButtons[i].firstChild.title = texts[i];
    }
    const search = new GeoSearch.GeoSearchControl({
        provider: new GeoSearch.OpenStreetMapProvider(),
    });
    mapContainer.addControl(search);

    // If a bbox is removed on the map, delete it from the input field as well:
    mapContainer.on("pm:remove", (e) => {
        const bboxInput = document.getElementById("bbox_input");
        const coords = e.layer.getLatLngs();
        const point1 = coords[0][0];
        const point2 = coords[0][2];
        const bbox = `${point1.lng.toPrecision(9)},${point1.lat.toPrecision(9)}`
            + `,${point2.lng.toPrecision(9)},${point2.lat.toPrecision(9)};`;
        bboxInput.value = bboxInput.value.replace(bbox, "");
    });

    mapContainer.on("pm:create", (e) => {
        // Add bounding box selected on the map to the input field and (if activated) adjust its
        // ratio to the chosen paper format
        const bboxInput = document.getElementById("bbox_input");
        const checkboxAdjust = document.getElementById("adjustToPaperFormat");
        const selectPaperFormat = document.getElementById("paperFormatSelection");
        const adjust = checkboxAdjust.checked;
        let coords = e.layer.getLatLngs()[0];
        if (adjust) {
            mapContainer.removeLayer(e.layer);
            const paperFormat = selectPaperFormat.value;
            let ratio = 0;
            // ratio = height/(width-right_margin)
            switch (paperFormat) {
                case "a0": ratio = 0.8094; break;
                case "a1": ratio = 0.8239; break;
                case "a2": ratio = 0.8502; break;
                case "a3": ratio = 0.8486; break;
                case "a4": ratio = 0.8502; break;
                case "a5": ratio = 0.8222; break;
                case "legal": ratio = 0.7059; break;
                case "letter": ratio = 0.9432; break;
                case "tabloid": ratio = 0.7707; break;
                default: ratio = 0.8486;
            }
            coords = getBbox(ratio, coords);
            e.layer = L.rectangle(coords).addTo(mapContainer);
        }
        const point1 = coords[0];
        const point2 = coords[2];

        const newBbox = `${point1.lng.toPrecision(9)},${point1.lat.toPrecision(9)}`
            + `,${point2.lng.toPrecision(9)},${point2.lat.toPrecision(9)};`;
        bboxInput.value += newBbox;

        // Change the bbox in the input field if the corresponding points on the map are edited
        e.layer.on("pm:dragstart", (e) => {
            pt = e.sourceTarget._bounds;
            oldCoords = pt._southWest.lng.toPrecision(9) + "," + pt._southWest.lat.toPrecision(9) + "," + pt._northEast.lng.toPrecision(9) + "," + pt._northEast.lat.toPrecision(9) + ";";
        });
        e.layer.on("pm:dragend", (e) => {
            pt = e.target._bounds;
            newCoords = pt._southWest.lng.toPrecision(9) + "," + pt._southWest.lat.toPrecision(9) + "," + pt._northEast.lng.toPrecision(9) + "," + pt._northEast.lat.toPrecision(9) + ";";
            bboxInput.value = bboxInput.value.replace(oldCoords, newCoords);
        });
        e.layer.on("pm:markerdragstart", (e) => {
            pt = e.sourceTarget._bounds;
            oldCoords = pt._southWest.lng.toPrecision(9) + "," + pt._southWest.lat.toPrecision(9) + "," + pt._northEast.lng.toPrecision(9) + "," + pt._northEast.lat.toPrecision(9) + ";";
        });
        e.layer.on("pm:markerdragend", (e) => {
            pt = e.target._bounds;
            newCoords = pt._southWest.lng.toPrecision(9) + "," + pt._southWest.lat.toPrecision(9) + "," + pt._northEast.lng.toPrecision(9) + "," + pt._northEast.lat.toPrecision(9) + ";";
            bboxInput.value = bboxInput.value.replace(oldCoords, newCoords);
        });
    });
}

/**
 * Remove all layers from a given map
 *
 * @param m (Leaflet-) Map the layers of which should be cleared
 */
function clearMap(m) {
    for (const i in m._layers) {
        if (m._layers[i]._path !== undefined) {
            try {
                m.removeLayer(m._layers[i]);
            } catch (e) {
                console.log("Cannot clear layer " + e + m._layers[i]);
            }
        }
    }
}

/**
 * Center a map on the coordinates entered in an input with the ID 'bbox_input' and zoom in
 *
 * @param map (Leaflet-) Map which should be zoomed to the bbox input
 */
function zoomToSelection(map) {
    const bboxInput = document.getElementById("bbox_input").value;
    const pattern = /^(?:(-?[0-9]*\.[0-9]*,){3}-?[0-9]*\.[0-9]*;?)+$/;

    if (pattern.test(bboxInput)) {
        clearMap(map);
        const bboxStrings = bboxInput.split(";");

        for (const bboxStr of bboxStrings) {
            if (bboxStr.length > 3) {
                const bbox = bboxStr.split(",");
                const bboxFormatted = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
                L.rectangle(bboxFormatted).addTo(map);
                map.fitBounds(bboxFormatted);
            }
        }
    } else {
        alert("You have either selected no area yet or entered an area in the wrong format.\n"
            + "Correct example: 8.69142561,49.4102821,8.69372067,49.4115517;");
    }
}
