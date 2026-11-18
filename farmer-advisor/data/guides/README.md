# Farming guides

Put guide files here. Supported formats: .md, .txt, .pdf

Folder layout decides the crop:

    data/guides/maize/maize_production_guide.pdf     crop = maize
    data/guides/general/soil_health.md               no specific crop

Markdown and text files may start with a header, followed by a blank line:

    title: Maize pest control
    source: NARO Maize Handbook, 2021
    crop: maize

    The text of the guide starts here.

Without a header, the title comes from the file name and the source from the file path.
Each source must be unique. Run `python -m scripts.ingest_guides` from the backend folder to load or reload the guides.
