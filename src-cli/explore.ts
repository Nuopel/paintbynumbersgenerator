#!/usr/bin/env node

import * as canvas from "canvas";
import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import { Settings, ClusteringColorSpace } from "../src/settings";
import { ColorReducer } from "../src/colorreductionmanagement";
import { FacetCreator } from "../src/facetCreator";
import { FacetReducer } from "../src/facetReducer";
import { FacetBorderTracer } from "../src/facetBorderTracer";
import { FacetBorderSegmenter } from "../src/facetBorderSegmenter";
import { FacetLabelPlacer } from "../src/facetLabelPlacer";
import { FacetResult } from "../src/facetmanagement";
import { RGB } from "../src/common";

interface ExplorationConfig {
    inputImage: string;
    outputDir: string;
    variations: {
        resizeImageWidth?: number[];
        resizeImageHeight?: number[];
        kMeansNrOfClusters?: number[];
        kMeansClusteringColorSpace?: ClusteringColorSpace[];
        removeFacetsSmallerThanNrOfPoints?: number[];
        removeFacetsFromLargeToSmall?: boolean[];
        maximumNumberOfFacets?: number[];
        narrowPixelStripCleanupRuns?: number[];
        nrOfTimesToHalveBorderSegments?: number[];
    };
}

interface ExplorationResult {
    id: string;
    settings: Settings;
    outputPath: string;
    processingTime: number;
    stats: {
        originalSize: { width: number; height: number };
        processedSize: { width: number; height: number };
        nrOfClusters: number;
        colorSpace: string;
        facetThreshold: number;
        facetOrderLargeToSmall: boolean;
        maxFacets: number;
        narrowPixelCleanup: number;
        borderSegments: number;
    };
}

class ImageExplorer {
    private config: ExplorationConfig;
    private results: ExplorationResult[] = [];
    private baseSettings: Settings;

    constructor(config: ExplorationConfig) {
        this.config = config;
        this.baseSettings = new Settings();

        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }
    }

    async explore(): Promise<void> {
        console.log('Starting exploration...');
        console.log(`Input image: ${this.config.inputImage}`);
        console.log(`Output directory: ${this.config.outputDir}`);

        // Generate all combinations of parameters
        const combinations = this.generateCombinations();
        console.log(`Generated ${combinations.length} parameter combinations to test`);

        // Process each combination
        for (let i = 0; i < combinations.length; i++) {
            const combo = combinations[i];
            console.log(`\nProcessing combination ${i + 1}/${combinations.length}...`);

            try {
                const result = await this.processWithSettings(combo, i);
                this.results.push(result);
                console.log(`✓ Completed in ${result.processingTime.toFixed(2)}s`);
            } catch (error) {
                console.error(`✗ Failed: ${error}`);
            }
        }

        // Generate HTML report
        console.log('\nGenerating HTML report...');
        this.generateHTMLReport();
        console.log(`✓ Report saved to: ${path.join(this.config.outputDir, 'report.html')}`);
    }

    private generateCombinations(): Settings[] {
        const combinations: Settings[] = [];
        const vars = this.config.variations;

        // Get arrays for each parameter (use default if not specified)
        const resizeWidths = vars.resizeImageWidth || [this.baseSettings.resizeImageWidth];
        const resizeHeights = vars.resizeImageHeight || [this.baseSettings.resizeImageHeight];
        const clusters = vars.kMeansNrOfClusters || [this.baseSettings.kMeansNrOfClusters];
        const colorSpaces = vars.kMeansClusteringColorSpace || [this.baseSettings.kMeansClusteringColorSpace];
        const facetThresholds = vars.removeFacetsSmallerThanNrOfPoints || [this.baseSettings.removeFacetsSmallerThanNrOfPoints];
        const facetOrders = vars.removeFacetsFromLargeToSmall !== undefined ? vars.removeFacetsFromLargeToSmall : [this.baseSettings.removeFacetsFromLargeToSmall];
        const maxFacets = vars.maximumNumberOfFacets || [this.baseSettings.maximumNumberOfFacets];
        const narrowPixelRuns = vars.narrowPixelStripCleanupRuns !== undefined ? vars.narrowPixelStripCleanupRuns : [this.baseSettings.narrowPixelStripCleanupRuns];
        const borderSegments = vars.nrOfTimesToHalveBorderSegments || [this.baseSettings.nrOfTimesToHalveBorderSegments];

        // Generate all combinations using nested loops
        for (const width of resizeWidths) {
            for (const height of resizeHeights) {
                for (const cluster of clusters) {
                    for (const colorSpace of colorSpaces) {
                        for (const facetThreshold of facetThresholds) {
                            for (const facetOrder of facetOrders) {
                                for (const maxFacet of maxFacets) {
                                    for (const narrowPixel of narrowPixelRuns) {
                                        for (const borderSegment of borderSegments) {
                                            const settings = new Settings();
                                            settings.resizeImageWidth = width;
                                            settings.resizeImageHeight = height;
                                            settings.kMeansNrOfClusters = cluster;
                                            settings.kMeansClusteringColorSpace = colorSpace;
                                            settings.removeFacetsSmallerThanNrOfPoints = facetThreshold;
                                            settings.removeFacetsFromLargeToSmall = facetOrder;
                                            settings.maximumNumberOfFacets = maxFacet;
                                            settings.narrowPixelStripCleanupRuns = narrowPixel;
                                            settings.nrOfTimesToHalveBorderSegments = borderSegment;
                                            combinations.push(settings);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return combinations;
    }

    private async processWithSettings(settings: Settings, index: number): Promise<ExplorationResult> {
        const startTime = Date.now();

        // Load image
        const img = await canvas.loadImage(this.config.inputImage);
        const c = canvas.createCanvas(img.width, img.height);
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, c.width, c.height);
        let imgData = ctx.getImageData(0, 0, c.width, c.height);

        const originalSize = { width: img.width, height: img.height };

        // Resize if needed
        if (settings.resizeImageIfTooLarge &&
            (c.width > settings.resizeImageWidth || c.height > settings.resizeImageHeight)) {
            let width = c.width;
            let height = c.height;

            if (width > settings.resizeImageWidth) {
                const newWidth = settings.resizeImageWidth;
                const newHeight = c.height / c.width * settings.resizeImageWidth;
                width = newWidth;
                height = newHeight;
            }
            if (height > settings.resizeImageHeight) {
                const newHeight = settings.resizeImageHeight;
                const newWidth = width / height * newHeight;
                width = newWidth;
                height = newHeight;
            }

            const tempCanvas = canvas.createCanvas(width, height);
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCanvas.getContext("2d")!.drawImage(c, 0, 0, width, height);
            c.width = width;
            c.height = height;
            ctx.drawImage(tempCanvas, 0, 0, width, height);
            imgData = ctx.getImageData(0, 0, c.width, c.height);
        }

        const processedSize = { width: c.width, height: c.height };

        // K-means clustering
        const cKmeans = canvas.createCanvas(imgData.width, imgData.height);
        const ctxKmeans = cKmeans.getContext("2d")!;
        ctxKmeans.fillStyle = "white";
        ctxKmeans.fillRect(0, 0, cKmeans.width, cKmeans.height);
        const kmeansImgData = ctxKmeans.getImageData(0, 0, cKmeans.width, cKmeans.height);

        await ColorReducer.applyKMeansClustering(imgData as any, kmeansImgData as any, ctx as any, settings, (kmeans) => {
            ctxKmeans.putImageData(kmeansImgData, 0, 0);
        });

        const colormapResult = ColorReducer.createColorMap(kmeansImgData as any);

        // Facet processing
        let facetResult = new FacetResult();
        if (typeof settings.narrowPixelStripCleanupRuns === "undefined" || settings.narrowPixelStripCleanupRuns === 0) {
            facetResult = await FacetCreator.getFacets(imgData.width, imgData.height, colormapResult.imgColorIndices, () => {});
            await FacetReducer.reduceFacets(settings.removeFacetsSmallerThanNrOfPoints, settings.removeFacetsFromLargeToSmall, settings.maximumNumberOfFacets, colormapResult.colorsByIndex, facetResult, colormapResult.imgColorIndices, () => {});
        } else {
            for (let run = 0; run < settings.narrowPixelStripCleanupRuns; run++) {
                await ColorReducer.processNarrowPixelStripCleanup(colormapResult);
                facetResult = await FacetCreator.getFacets(imgData.width, imgData.height, colormapResult.imgColorIndices, () => {});
                await FacetReducer.reduceFacets(settings.removeFacetsSmallerThanNrOfPoints, settings.removeFacetsFromLargeToSmall, settings.maximumNumberOfFacets, colormapResult.colorsByIndex, facetResult, colormapResult.imgColorIndices, () => {});
            }
        }

        // Border processing
        await FacetBorderTracer.buildFacetBorderPaths(facetResult, () => {});
        await FacetBorderSegmenter.buildFacetBorderSegments(facetResult, settings.nrOfTimesToHalveBorderSegments, () => {});
        await FacetLabelPlacer.buildFacetLabelBounds(facetResult, () => {});

        // Generate SVG
        const id = this.generateId(settings, index);
        const outputPath = path.join(this.config.outputDir, `${id}.svg`);
        const svgString = await this.createSVG(facetResult, colormapResult.colorsByIndex, 1, true, true, true, 10, "black", settings.strokeWidth);

        fs.writeFileSync(outputPath, svgString);

        const processingTime = (Date.now() - startTime) / 1000;

        return {
            id,
            settings,
            outputPath,
            processingTime,
            stats: {
                originalSize,
                processedSize,
                nrOfClusters: settings.kMeansNrOfClusters,
                colorSpace: ClusteringColorSpace[settings.kMeansClusteringColorSpace],
                facetThreshold: settings.removeFacetsSmallerThanNrOfPoints,
                facetOrderLargeToSmall: settings.removeFacetsFromLargeToSmall,
                maxFacets: settings.maximumNumberOfFacets,
                narrowPixelCleanup: settings.narrowPixelStripCleanupRuns,
                borderSegments: settings.nrOfTimesToHalveBorderSegments
            }
        };
    }

    private async createSVG(facetResult: FacetResult, colorsByIndex: RGB[], sizeMultiplier: number, fillFacets: boolean, showBorders: boolean, showLabels: boolean, fontSize: number, fontColor: string, strokeWidth: number): Promise<string> {
        const xmlns = "http://www.w3.org/2000/svg";
        const svgWidth = sizeMultiplier * facetResult.width;
        const svgHeight = sizeMultiplier * facetResult.height;

        let svg = `<?xml version="1.0" standalone="no"?>
                    <svg width="${svgWidth}" height="${svgHeight}" xmlns="${xmlns}">`;

        // Add facets
        for (const f of facetResult.facets) {
            if (f == null || f.borderSegments.length === 0) continue;

            // Get full path from border segments
            const newpath = f.getFullPathFromBorderSegments(false);
            if (newpath.length === 0) continue;

            // Create path data using quadratic curves
            let data = "M ";
            data += newpath[0].x * sizeMultiplier + " " + newpath[0].y * sizeMultiplier + " ";
            for (let i = 1; i < newpath.length; i++) {
                const midpointX = (newpath[i].x + newpath[i - 1].x) / 2;
                const midpointY = (newpath[i].y + newpath[i - 1].y) / 2;
                data += "Q " + (midpointX * sizeMultiplier) + " " + (midpointY * sizeMultiplier) + " " + (newpath[i].x * sizeMultiplier) + " " + (newpath[i].y * sizeMultiplier) + " ";
            }

            const color = colorsByIndex[f.color];
            const svgFill = fillFacets ? `rgb(${color[0]},${color[1]},${color[2]})` : "none";
            const svgStroke = showBorders ? "#000" : (fillFacets ? `rgb(${color[0]},${color[1]},${color[2]})` : "");

            let pathString = `<path data-facetId="${f.id}" d="${data}" style="fill: ${svgFill};`;
            if (svgStroke !== "") {
                pathString += `stroke: ${svgStroke}; stroke-width:${strokeWidth}px`;
            }
            pathString += `"></path>`;

            svg += pathString;

            // Add label
            if (showLabels && f.labelBounds) {
                const labelOffsetX = f.labelBounds.minX * sizeMultiplier;
                const labelOffsetY = f.labelBounds.minY * sizeMultiplier;
                const labelWidth = f.labelBounds.width * sizeMultiplier;
                const labelHeight = f.labelBounds.height * sizeMultiplier;

                const nrOfDigits = (f.color + "").length;
                const svgLabelString = `<g class="label" transform="translate(${labelOffsetX},${labelOffsetY})">
                                            <svg width="${labelWidth}" height="${labelHeight}" overflow="visible" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid meet">
                                                <text font-family="Tahoma" font-size="${(fontSize / nrOfDigits)}" dominant-baseline="middle" text-anchor="middle" fill="${fontColor}">${f.color}</text>
                                            </svg>
                                       </g>`;
                svg += svgLabelString;
            }
        }

        svg += "</svg>";
        return svg;
    }

    private toHex(value: number): string {
        const hex = Math.round(value).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

    private generateId(settings: Settings, index: number): string {
        const parts = [
            `idx${index}`,
            `w${settings.resizeImageWidth}h${settings.resizeImageHeight}`,
            `c${settings.kMeansNrOfClusters}`,
            `cs${ClusteringColorSpace[settings.kMeansClusteringColorSpace]}`,
            `ft${settings.removeFacetsSmallerThanNrOfPoints}`,
            `fo${settings.removeFacetsFromLargeToSmall ? 'L2S' : 'S2L'}`,
            `mf${settings.maximumNumberOfFacets === Infinity ? 'inf' : settings.maximumNumberOfFacets}`,
            `np${settings.narrowPixelStripCleanupRuns}`,
            `bs${settings.nrOfTimesToHalveBorderSegments}`
        ];
        return parts.join('_');
    }

    private generateHTMLReport(): void {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paint-by-Numbers Exploration Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }

        .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
        }

        .meta {
            color: #666;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }

        .meta p {
            margin: 5px 0;
        }

        .filters {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
        }

        .filters h3 {
            margin-bottom: 15px;
            color: #333;
        }

        .filter-group {
            margin-bottom: 15px;
        }

        .filter-group label {
            display: inline-block;
            width: 200px;
            font-weight: 600;
            color: #555;
        }

        .filter-group select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            min-width: 150px;
            font-size: 14px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 30px;
            margin-top: 20px;
        }

        .result-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            background: white;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .result-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .result-card.hidden {
            display: none;
        }

        .image-container {
            width: 100%;
            height: 300px;
            background: #fafafa;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-bottom: 1px solid #e0e0e0;
        }

        .image-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }

        .details {
            padding: 15px;
        }

        .details h3 {
            font-size: 14px;
            color: #333;
            margin-bottom: 10px;
            font-family: 'Courier New', monospace;
        }

        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 13px;
        }

        .stat-row {
            display: contents;
        }

        .stat-label {
            color: #666;
            font-weight: 500;
        }

        .stat-value {
            color: #333;
            font-weight: 600;
        }

        .processing-time {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 12px;
        }

        .comparison-mode {
            margin-bottom: 20px;
        }

        .comparison-mode button {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
        }

        .comparison-mode button:hover {
            background: #0056b3;
        }

        .comparison-mode button.active {
            background: #28a745;
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Paint-by-Numbers Exploration Report</h1>
        <div class="meta">
            <p><strong>Input Image:</strong> ${this.config.inputImage}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Combinations:</strong> ${this.results.length}</p>
        </div>

        <div class="filters">
            <h3>Filter Results</h3>
            <div class="filter-group">
                <label>Image Width:</label>
                <select id="filter-width" onchange="applyFilters()">
                    <option value="all">All</option>
                    ${this.getUniqueValues('resizeImageWidth').map(v => `<option value="${v}">${v}px</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Image Height:</label>
                <select id="filter-height" onchange="applyFilters()">
                    <option value="all">All</option>
                    ${this.getUniqueValues('resizeImageHeight').map(v => `<option value="${v}">${v}px</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Number of Clusters:</label>
                <select id="filter-clusters" onchange="applyFilters()">
                    <option value="all">All</option>
                    ${this.getUniqueValues('kMeansNrOfClusters').map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Color Space:</label>
                <select id="filter-colorspace" onchange="applyFilters()">
                    <option value="all">All</option>
                    ${this.getUniqueValues('colorSpace').map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Facet Threshold:</label>
                <select id="filter-facet" onchange="applyFilters()">
                    <option value="all">All</option>
                    ${this.getUniqueValues('facetThreshold').map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Facet Order:</label>
                <select id="filter-facetorder" onchange="applyFilters()">
                    <option value="all">All</option>
                    ${this.getUniqueValues('facetOrderLargeToSmall').map(v => `<option value="${v}">${v ? 'Large to Small' : 'Small to Large'}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Max Facets:</label>
                <select id="filter-maxfacets" onchange="applyFilters()">
                    <option value="all">All</option>
                    ${this.getUniqueValues('maxFacets').map(v => `<option value="${v}">${v === Infinity ? '∞' : v}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Narrow Pixel Cleanup:</label>
                <select id="filter-narrowpixel" onchange="applyFilters()">
                    <option value="all">All</option>
                    ${this.getUniqueValues('narrowPixelCleanup').map(v => `<option value="${v}">${v} runs</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Border Segments:</label>
                <select id="filter-border" onchange="applyFilters()">
                    <option value="all">All</option>
                    ${this.getUniqueValues('borderSegments').map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="grid">
            ${this.results.map(result => this.generateResultCard(result)).join('')}
        </div>
    </div>

    <script>
        function applyFilters() {
            const width = document.getElementById('filter-width').value;
            const height = document.getElementById('filter-height').value;
            const clusters = document.getElementById('filter-clusters').value;
            const colorspace = document.getElementById('filter-colorspace').value;
            const facet = document.getElementById('filter-facet').value;
            const facetorder = document.getElementById('filter-facetorder').value;
            const maxfacets = document.getElementById('filter-maxfacets').value;
            const narrowpixel = document.getElementById('filter-narrowpixel').value;
            const border = document.getElementById('filter-border').value;

            document.querySelectorAll('.result-card').forEach(card => {
                const show = (
                    (width === 'all' || card.dataset.width === width) &&
                    (height === 'all' || card.dataset.height === height) &&
                    (clusters === 'all' || card.dataset.clusters === clusters) &&
                    (colorspace === 'all' || card.dataset.colorspace === colorspace) &&
                    (facet === 'all' || card.dataset.facet === facet) &&
                    (facetorder === 'all' || card.dataset.facetorder === facetorder) &&
                    (maxfacets === 'all' || card.dataset.maxfacets === maxfacets) &&
                    (narrowpixel === 'all' || card.dataset.narrowpixel === narrowpixel) &&
                    (border === 'all' || card.dataset.border === border)
                );

                if (show) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        }
    </script>
</body>
</html>`;

        fs.writeFileSync(path.join(this.config.outputDir, 'report.html'), html);
    }

    private getUniqueValues(field: string): (string | number | boolean)[] {
        const values = new Set<string | number | boolean>();
        this.results.forEach(result => {
            let value: string | number | boolean;
            switch (field) {
                case 'resizeImageWidth':
                    value = result.settings.resizeImageWidth;
                    break;
                case 'resizeImageHeight':
                    value = result.settings.resizeImageHeight;
                    break;
                case 'kMeansNrOfClusters':
                    value = result.stats.nrOfClusters;
                    break;
                case 'colorSpace':
                    value = result.stats.colorSpace;
                    break;
                case 'facetThreshold':
                    value = result.stats.facetThreshold;
                    break;
                case 'facetOrderLargeToSmall':
                    value = result.stats.facetOrderLargeToSmall;
                    break;
                case 'maxFacets':
                    value = result.stats.maxFacets;
                    break;
                case 'narrowPixelCleanup':
                    value = result.stats.narrowPixelCleanup;
                    break;
                case 'borderSegments':
                    value = result.stats.borderSegments;
                    break;
                default:
                    return;
            }
            values.add(value);
        });
        return Array.from(values).sort();
    }

    private generateResultCard(result: ExplorationResult): string {
        return `
            <div class="result-card"
                 data-width="${result.settings.resizeImageWidth}"
                 data-height="${result.settings.resizeImageHeight}"
                 data-clusters="${result.stats.nrOfClusters}"
                 data-colorspace="${result.stats.colorSpace}"
                 data-facet="${result.stats.facetThreshold}"
                 data-facetorder="${result.stats.facetOrderLargeToSmall}"
                 data-maxfacets="${result.stats.maxFacets}"
                 data-narrowpixel="${result.stats.narrowPixelCleanup}"
                 data-border="${result.stats.borderSegments}">
                <div class="image-container">
                    <img src="${path.basename(result.outputPath)}" alt="${result.id}">
                </div>
                <div class="details">
                    <h3>${result.id}</h3>
                    <div class="stats">
                        <div class="stat-row">
                            <div class="stat-label">Image Size:</div>
                            <div class="stat-value">${result.stats.processedSize.width}×${result.stats.processedSize.height}</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label">Clusters:</div>
                            <div class="stat-value">${result.stats.nrOfClusters}</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label">Color Space:</div>
                            <div class="stat-value">${result.stats.colorSpace}</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label">Facet Threshold:</div>
                            <div class="stat-value">${result.stats.facetThreshold}</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label">Facet Order:</div>
                            <div class="stat-value">${result.stats.facetOrderLargeToSmall ? 'L→S' : 'S→L'}</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label">Max Facets:</div>
                            <div class="stat-value">${result.stats.maxFacets === Infinity ? '∞' : result.stats.maxFacets}</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label">Narrow Pixel:</div>
                            <div class="stat-value">${result.stats.narrowPixelCleanup} runs</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-label">Border Halving:</div>
                            <div class="stat-value">${result.stats.borderSegments}</div>
                        </div>
                    </div>
                    <div class="processing-time">
                        Processing time: ${result.processingTime.toFixed(2)}s
                    </div>
                </div>
            </div>`;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Paint-by-Numbers Exploration Tool

Usage:
  npm run explore -- -i <input-image> [-o <output-dir>] [-c <config-file>]

Options:
  -i, --input <file>      Input image file (required)
  -o, --output <dir>      Output directory (default: ./exploration)
  -c, --config <file>     JSON configuration file for parameter variations

Example config.json:
{
  "variations": {
    "resizeImageWidth": [512, 1024, 2048],
    "kMeansNrOfClusters": [8, 16, 32],
    "kMeansClusteringColorSpace": [0, 1, 2],
    "removeFacetsSmallerThanNrOfPoints": [10, 20, 50],
    "nrOfTimesToHalveBorderSegments": [1, 2, 3]
  }
}

Color Space values:
  0 = RGB
  1 = HSL
  2 = LAB

If no config is provided, default variations will be used.
        `);
        process.exit(0);
    }

    let inputImage = '';
    let outputDir = './exploration';
    let configFile = '';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-i' || args[i] === '--input') {
            inputImage = args[++i];
        } else if (args[i] === '-o' || args[i] === '--output') {
            outputDir = args[++i];
        } else if (args[i] === '-c' || args[i] === '--config') {
            configFile = args[++i];
        }
    }

    if (!inputImage) {
        console.error('Error: Input image is required. Use -i <file>');
        process.exit(1);
    }

    if (!fs.existsSync(inputImage)) {
        console.error(`Error: Input image not found: ${inputImage}`);
        process.exit(1);
    }

    // Load configuration
    let variations: ExplorationConfig['variations'] = {};

    if (configFile) {
        if (!fs.existsSync(configFile)) {
            console.error(`Error: Config file not found: ${configFile}`);
            process.exit(1);
        }
        const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        variations = config.variations || {};
    } else {
        // Default variations for quick exploration
        variations = {
            kMeansNrOfClusters: [8, 16, 24],
            kMeansClusteringColorSpace: [0, 1, 2], // RGB, HSL, LAB
            removeFacetsSmallerThanNrOfPoints: [10, 20],
            nrOfTimesToHalveBorderSegments: [1, 2]
        };
    }

    const config: ExplorationConfig = {
        inputImage,
        outputDir,
        variations
    };

    const explorer = new ImageExplorer(config);
    await explorer.explore();

    console.log('\n✓ Exploration complete!');
    console.log(`Open ${path.join(outputDir, 'report.html')} in your browser to view results.`);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
