# markweb

Version **4.0.0**

`markweb` is a Markdown-based static site generator.

## Features

- Recursive parsing of Markdown files to HTML.
- Template selection for customizing overall site appearance.

## Project Setup

Clone repository and install dependencies by running the following command:

```bash
git clone https://github.com/deyixtan/markweb.git
cd markweb
pnpm install
```

## Usage

Run the following command to use a default template:

```bash
pnpm run start -t <markdown-directory> -o <output-directory> -t "templates/bootstrap.html"
```

Note: To view more options, run `--help`.

## Ignoring files during generation

The `.markwebignore` (similar to how `.gitignore` works) can be specified in the root content directory.

Files and directories that match any of the patterns specified in the `.markwebignore` file will avoid being generated in the static site.

Example:

```
**/.git*
.markwebignore
```

## Continuous Deployment to GitHub Pages

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
      - name: Clone markweb
        uses: actions/checkout@v3
        with:
          repository: deyixtan/markweb

      - name: Checkout repository code
        uses: actions/checkout@v3
        with:
          path: data

      - name: Install dependencies
        run: |
          pnpm install

      - name: Generate static content
        run: |
          pnpm run start -i "data/" -o "dist/" -t "${{ vars.THEME_PATH || 'templates/bootstrap.html' }}" -p "${{ github.event.repository.name }}" -d

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
