Place your project archives (.zip, .tar.gz, etc.) in this folder.

- Add one entry per project in `projects.json` with keys:
  - id: unique id
  - title: display title
  - description: short description
  - thumbnail: path to an image (relative to this folder, e.g. `../assets/thumb.png`)
  - file: path to the downloadable archive (e.g. `projects/myproject.zip`)
  - page: optional external or internal URL to view the project

Example entry:

{
  "id": "myproj",
  "title": "My Project",
  "description": "A short description",
  "thumbnail": "assets/myproj.png",
  "file": "projects/myproj.zip",
  "page": "https://example.com/myproj"
}
