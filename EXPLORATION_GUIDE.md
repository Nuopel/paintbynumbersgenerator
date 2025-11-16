# Paint-by-Numbers Exploration Tool

A powerful tool for systematically exploring different parameter combinations to find the optimal settings for your paint-by-numbers images.

## Overview

The exploration tool automatically generates multiple variations of a paint-by-numbers output using different parameter combinations, then creates an interactive HTML report for easy side-by-side comparison.

## Quick Start

```bash
# Basic usage with default parameter variations
npm run explore -- -i path/to/your/image.jpg -o ./exploration_results

# Using a custom configuration file
npm run explore -- -i image.jpg -o results -c my_config.json
```

## Parameter Variations

The tool can vary the following parameters:

### Image Resolution
- **`resizeImageWidth`**: Controls the maximum width of the processed image
  - Smaller values = faster processing, less detail
  - Larger values = slower processing, more detail
  - Recommended range: 512, 1024, 2048

- **`resizeImageHeight`**: Controls the maximum height of the processed image
  - Usually set equal to width to maintain aspect ratio
  - Can be set independently for specific aspect ratios
  - Recommended range: 512, 1024, 2048

### Color Clustering
- **`kMeansNrOfClusters`**: Number of colors in the final output
  - Fewer clusters = simpler image, larger regions
  - More clusters = more detail, smaller regions
  - Recommended range: 8, 16, 24, 32, 64

- **`kMeansClusteringColorSpace`**: Color space used for clustering
  - `0` = RGB (standard color space)
  - `1` = HSL (Hue, Saturation, Lightness - perceptually uniform)
  - `2` = LAB (CIE Lab - most perceptually uniform, best for color accuracy)

### Facet Processing
- **`removeFacetsSmallerThanNrOfPoints`**: Minimum size for colored regions (in pixels)
  - Smaller values = keep tiny details
  - Larger values = remove small artifacts
  - Recommended range: 5, 10, 20, 50, 100

- **`removeFacetsFromLargeToSmall`**: Order in which facets are removed (boolean)
  - `true` = Process large facets first (prevents boundary warping, recommended)
  - `false` = Process small facets first
  - Default: `true`

- **`maximumNumberOfFacets`**: Hard limit on the number of color regions
  - Forces the image to have at most this many regions
  - Useful for ensuring paint-by-number complexity stays manageable
  - Use `Infinity` or a large number for no limit
  - Recommended range: 50, 100, 200, 500

- **`narrowPixelStripCleanupRuns`**: Number of iterations to remove thin colored lines
  - `0` = no cleanup (faster, may have artifacts)
  - Higher values = cleaner edges, but slower processing
  - Recommended range: 0, 1, 3

### Border Smoothing
- **`nrOfTimesToHalveBorderSegments`**: Number of border smoothing iterations
  - `0` = no smoothing (jagged edges)
  - Higher values = smoother curves
  - Recommended range: 0, 1, 2, 3, 5

## Configuration File Format

Create a JSON file with your desired parameter variations:

```json
{
  "variations": {
    "resizeImageWidth": [512, 1024, 2048],
    "resizeImageHeight": [512, 1024, 2048],
    "kMeansNrOfClusters": [8, 16, 24, 32],
    "kMeansClusteringColorSpace": [0, 1, 2],
    "removeFacetsSmallerThanNrOfPoints": [10, 20, 50],
    "removeFacetsFromLargeToSmall": [true, false],
    "maximumNumberOfFacets": [100, 200, 500],
    "narrowPixelStripCleanupRuns": [0, 1, 3],
    "nrOfTimesToHalveBorderSegments": [1, 2, 3]
  }
}
```

**Note**: The tool generates all possible combinations of the specified parameters. For example, the configuration above would generate 3 × 3 × 4 × 3 × 3 × 2 × 3 × 3 × 3 = 52,488 variations! Start with fewer values per parameter to keep the number manageable.

### Managing Combination Explosion

To keep processing time reasonable:

1. **Start small**: Test with 2-3 values per parameter first
2. **Focus on key parameters**: Vary only the most impactful parameters
3. **Use default variations**: If no config is provided, the tool uses sensible defaults

## Default Variations

When no configuration file is provided, the tool uses:

```json
{
  "variations": {
    "kMeansNrOfClusters": [8, 16, 24],
    "kMeansClusteringColorSpace": [0, 1, 2],
    "removeFacetsSmallerThanNrOfPoints": [10, 20],
    "nrOfTimesToHalveBorderSegments": [1, 2]
  }
}
```

This generates 3 × 3 × 2 × 2 = 36 variations.

## Understanding the HTML Report

The generated report (`report.html`) includes:

### Filter Controls
- Filter results by any parameter value
- Combine multiple filters to narrow down results
- Filters update the view in real-time

### Result Cards
Each card shows:
- **Preview**: Visual preview of the generated SVG
- **Settings**: All parameter values used
- **Processing Time**: How long it took to generate

### Comparison Tips

1. **Look for patterns**: Which color space works best for your image type?
2. **Balance detail vs. simplicity**: More clusters ≠ better results
3. **Check border quality**: Smooth borders look more professional
4. **Consider facet size**: Tiny facets can be hard to paint

## Example Workflows

### Finding the Best Color Count
```json
{
  "variations": {
    "kMeansNrOfClusters": [6, 8, 12, 16, 20, 24, 32, 48, 64]
  }
}
```

### Comparing Color Spaces
```json
{
  "variations": {
    "kMeansNrOfClusters": [16],
    "kMeansClusteringColorSpace": [0, 1, 2]
  }
}
```

### Optimizing Border Smoothness
```json
{
  "variations": {
    "kMeansNrOfClusters": [16],
    "nrOfTimesToHalveBorderSegments": [0, 1, 2, 3, 4, 5]
  }
}
```

### Full Exploration (Warning: Many combinations!)
```json
{
  "variations": {
    "resizeImageWidth": [512, 1024],
    "kMeansNrOfClusters": [12, 16, 24],
    "kMeansClusteringColorSpace": [0, 1, 2],
    "removeFacetsSmallerThanNrOfPoints": [10, 20],
    "nrOfTimesToHalveBorderSegments": [1, 2]
  }
}
```
This generates 2 × 3 × 3 × 2 × 2 = 72 variations.

## Performance Considerations

Processing time depends on:
- **Image resolution**: Higher resolution = longer processing
- **Number of clusters**: More clusters = longer k-means convergence
- **Number of variations**: Linear scaling with variation count

### Estimated Processing Times (per variation)

| Image Size | Clusters | Approximate Time |
|------------|----------|------------------|
| 512×512    | 16       | 5-10 seconds     |
| 1024×1024  | 16       | 20-40 seconds    |
| 2048×2048  | 16       | 1-3 minutes      |
| 512×512    | 64       | 15-30 seconds    |
| 1024×1024  | 64       | 1-2 minutes      |

For 36 variations at 1024×1024 with 16 clusters: approximately 12-24 minutes total.

## Command Line Reference

```
npm run explore -- [options]

Options:
  -i, --input <file>      Input image file (required)
  -o, --output <dir>      Output directory (default: ./exploration)
  -c, --config <file>     JSON configuration file for parameter variations
  -h, --help              Show help message

Examples:
  npm run explore -- -i photo.jpg
  npm run explore -- -i landscape.png -o results/landscape
  npm run explore -- -i portrait.jpg -c portrait_config.json -o portrait_results
```

## Tips for Best Results

1. **Start with a reference**: Process the image once with default settings first
2. **Vary one thing at a time**: Helps understand each parameter's impact
3. **Use appropriate images**: Complex photos need more clusters than simple graphics
4. **Consider the final use**: Fewer colors = easier to paint, but less detail
5. **Check color accuracy**: LAB color space often produces more natural results

## Troubleshooting

### Out of memory errors
- Reduce image resolution (`resizeImageWidth`)
- Decrease number of variations
- Process in batches

### Very long processing times
- Use smaller `resizeImageWidth` values
- Reduce number of clusters
- Limit the number of parameter variations

### Poor quality results
- Increase `kMeansNrOfClusters` for more detail
- Try LAB color space (`kMeansClusteringColorSpace: 2`)
- Increase `nrOfTimesToHalveBorderSegments` for smoother edges

## See Also

- [example_exploration_config.json](./example_exploration_config.json) - Example configuration file
- [example_settings.json](./example_settings.json) - Full settings format for the main CLI tool
- [README.md](./README.md) - Main project documentation
