# Paint by Numbers Generator

Generate paint-by-number images (vectorized with SVG) from any input image.

## About This Repository

This repository is a **modernized fork** of the original [Paint by Numbers Generator](https://github.com/drake7707/paintbynumbersgenerator). Significant refactoring work has been undertaken to improve code quality, maintainability, and testability.

### Related Projects

**Python Implementation:** A complete Python port of this project is now available at [paintbynumbers-python](https://github.com/Nuopel/paintbynumbers-python/tree/master), offering:
- Full CLI and Python API
- 11-stage processing pipeline
- Multiple output formats (SVG, PNG, JPG)
- 92% test coverage with 420+ tests
- NumPy-optimized performance

### Refactoring Project

This repository has undergone extensive refactoring documented in the [`lots/`](./lots) directory:
- **21 work packages (LOTs)** covering test infrastructure, utilities, core algorithms, and interfaces
- **Systematic modernization** following a Work Breakdown Structure (WBS)
- **Zero regression approach** with snapshot testing
- See [`lots/PROJECT_README.md`](./lots/PROJECT_README.md) for complete refactoring documentation
- See [`lots/SUMMARY.md`](./lots/SUMMARY.md) for project overview

---

## Demo

Try it out at [https://drake7707.github.io/paintbynumbersgenerator/index.html](https://drake7707.github.io/paintbynumbersgenerator/index.html)

---

## Getting Started

### Prerequisites

- Node.js and npm installed
- For CLI: pkg installed globally (`npm install pkg -g`)

### Installation

```bash
# Clone the repository
git clone https://github.com/Nuopel/paintbynumbersgenerator.git
cd paintbynumbersgenerator

# Install dependencies
npm install

# Start development server
npm start
```

---

## Usage

### Web Interface

1. Run `npm start` to start the local development server
2. Open your browser to the localhost URL shown
3. Upload an image and adjust settings
4. Generate and download your paint-by-numbers template

### CLI Version

The CLI version is a self-contained Node application for batch processing and automation.

#### Basic Usage

```bash
paint-by-numbers-generator-win.exe -i input.png -o output.svg
```

#### Configuration

Settings can be configured in `settings.json` or specified via `-c path_to_settings.json`:

**Core Settings:**

- **`randomSeed`**: Random seed for k-means clustering (ensures reproducible results)
- **`kMeansNrOfClusters`**: Number of colors to quantize the image to
- **`kMeansMinDeltaDifference`**: Convergence threshold for k-means (default: 1)
- **`kMeansClusteringColorSpace`**: Color space for clustering (RGB, HSL, or LAB)
- **`kMeansColorRestrictions`**: Limit colors to specific palette (useful if you have limited paint colors)

**Color Aliases:**

Define custom color names for easier reference:

```json
"colorAliases": {
    "A1": [0, 0, 0],
    "A2": [255, 0, 0],
    "A3": [0, 255, 0]
}
```

**Facet Settings:**

- **`removeFacetsSmallerThanNrOfPoints`**: Remove facets smaller than N pixels
- **`removeFacetsFromLargeToSmall`**: Remove largest to smallest (prevents boundary warping, slower)
- **`maximumNumberOfFacets`**: Maximum number of facets to keep
- **`narrowPixelStripCleanupRuns`**: Number of iterations to remove narrow pixel strips

**Smoothing:**

- **`nrOfTimesToHalveBorderSegments`**: Border smoothing level (higher = smoother, less detail)

**Image Resizing:**

- **`resizeImageIfTooLarge`**: Auto-resize large images
- **`resizeImageWidth`**: Maximum width
- **`resizeImageHeight`**: Maximum height

#### Output Profiles

Define multiple output formats with custom settings:

```json
"outputProfiles": [
    {
        "name": "full",
        "svgShowLabels": true,
        "svgFillFacets": true,
        "svgShowBorders": true,
        "svgSizeMultiplier": 3,
        "svgFontSize": 50,
        "svgFontColor": "#333",
        "filetype": "png"
    },
    {
        "name": "bordersLabels",
        "svgShowLabels": true,
        "svgFillFacets": false,
        "svgShowBorders": true,
        "svgSizeMultiplier": 3,
        "svgFontSize": 50,
        "svgFontColor": "#333",
        "filetype": "svg"
    },
    {
        "name": "jpgtest",
        "svgShowLabels": false,
        "svgFillFacets": true,
        "svgShowBorders": false,
        "svgSizeMultiplier": 3,
        "svgFontSize": 50,
        "svgFontColor": "#333",
        "filetype": "jpg",
        "filetypeQuality": 80
    }
]
```

#### JSON Output

The CLI also generates a JSON file with palette information:

```json
{
    "areaPercentage": 0.20327615489130435,
    "color": [59, 36, 27],
    "frequency": 119689,
    "index": 0
}
```

This shows the percentage of the image covered by each color, useful for planning paint purchases.

---

## Screenshots

![Screenshot - Settings Interface](https://i.imgur.com/6uHm78x.png)

![Screenshot - Generated Output](https://i.imgur.com/cY9ieAy.png)

## Example Output

![Example Output 1](https://i.imgur.com/2Zuo13d.png)

![Example Output 2](https://i.imgur.com/SxWhOc7.png)

---

## Development

### Running Locally

This project uses TypeScript and is configured for VSCode with built-in debugging support.

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests (if available)
npm test

# Type check
tsc --noEmit

# Lint code
npm run lint
```

### Compiling the CLI

Install `pkg` globally if you haven't already:

```bash
npm install pkg -g
```

Then compile for all platforms:

```bash
pkg .
```

This generates executables for Linux, Windows, and macOS.

---

## Algorithm Overview

The paint-by-numbers generation process involves several key steps:

1. **Image Loading & Preprocessing**: Resize if needed
2. **Color Quantization**: K-means clustering to reduce colors
3. **Facet Creation**: Group connected pixels of the same color
4. **Facet Optimization**: Remove small facets, merge similar regions
5. **Border Tracing**: Extract boundaries between color regions
6. **Border Smoothing**: Haar wavelet reduction for cleaner lines
7. **Label Placement**: Calculate optimal position for color numbers
8. **SVG Generation**: Create vector output with Bézier curves

For detailed implementation notes, see the [`lots/`](./lots) directory and the [Python implementation documentation](https://github.com/Nuopel/paintbynumbers-python/).

---

## Project Status

**Original Project**: This was a proof of concept created by [drake7707](https://github.com/drake7707) and is not actively maintained by the original author.

**This Fork**: Active refactoring and modernization work is ongoing. See:
- [`lots/PROJECT_README.md`](./lots/PROJECT_README.md) - Refactoring project overview
- [`lots/SUMMARY.md`](./lots/SUMMARY.md) - Summary of changes
- Individual LOT files in [`lots/`](./lots) - Detailed task breakdown

**Python Version**: For a production-ready Python implementation with comprehensive tests and API, see [paintbynumbers-python](https://github.com/Nuopel/paintbynumbers-python/).

---

## Contributing

Feel free to fork and make your own changes. If you're working on this refactoring project, please follow the Work Breakdown Structure documented in the `lots/` directory.

---

## License

See [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

- Original project by [drake7707](https://github.com/drake7707)
- Refactoring and Python port by [Nuopel](https://github.com/Nuopel)
