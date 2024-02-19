# md-ssg

A minimal yet flexible Markdown-based static site generator.

## Version 1.0.0

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
