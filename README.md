# SOU Grounds Map

Interactive aerial map of SOU grounds. Static, client-side, embeds in Notion.

## Run locally
    python -m http.server 8000   # then open http://localhost:8000/

## Edit boundaries (Zack only)
Open `http://localhost:8000/?edit=1`. Draw, style, then **Export GeoJSON** and
commit `data/boundaries.geojson`. See "How to add a layer" below (Task 8).

## Tests
    node --test        # pure-logic unit tests (no dependencies)
