# md-ssg

Version **3.0.0**

A minimal yet flexible Markdown-based static site generator.

## Features

- Conversion of Markdown files to HTML.
- Recursive parsing of Markdown files within the content directory.
- Automatic navigation pane generation based on `SUMMARY.md` located in content's root directory.
- Template selection for customizing overall site appearance.

## Usage

### Project Setup

Clone repository and install dependencies by running the following command:

```bash
git clone https://github.com/deyixtan/md-ssg.git
cd md-ssg
npm install
```

### Prepare Markdown Content

1. Create a `data` directory in the project root. This will be your content directory.
2. Place your Markdown files (`.md`) inside the `data` directory.

### Generate Static Site

Run the following command to use a default template (`default.html`):

```bash
npm run start
```

You can also run the following command to use a custom template for deeper customization:

```bash
npm run start <template_path>
```

The generated HTML files, along with any necessary assets, will be generated in the `dist` directory.

### Continuous Deployment to GitHub Pages

1. Create a GitHub workflow (`.github/workflows/build_and_deploy.yml`) with the code provided in your content repository:

```yml
name: Build and Deploy Static Site

on:
  push:
    branches: [main]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      pages: write
      id-token: write

    environment:
      name: github-pages
      url: ${{steps.deployment.outputs.page_url}}

    steps:
      - name: Clone md-ssg
        uses: actions/checkout@v3
        with:
          repository: deyixtan/md-ssg

      - name: Checkout repository code
        uses: actions/checkout@v3
        with:
          path: data

      - name: Install dependencies
        run: |
          npm install

      - name: Generate static content
        run: |
          npm run start "${{ vars.THEME_PATH || '' }}" "${{ github.event.repository.name }}"

      - name: Handle entry page
        run: |
          cd dist
          echo "<script>location.href = \"README.html\"</script>" > index.html
          touch .nojekyll

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

2. [OPTIONAL] Select a specific template by assigning its file path to the `THEME_PATH` repository variable (found at `https://github.com/<username>/<repo_name>/settings/variables/actions`).

3. When you push new Markdown changes into your content repository, the above GitHub workflow is triggered.

4. The workflow will regenerate your static site using the updated content and automatically deploy it to your GitHub Pages URL. The updated site will be live at `https://<username>.github.io/<repo_name>`.
