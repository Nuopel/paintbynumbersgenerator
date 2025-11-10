import { downloadPalettePng, downloadPNG, downloadSVG, loadExample, process, updateOutput } from "./gui";
import { Clipboard } from "./lib/clipboard";

$(document).ready(function () {

    $(".tabs").tabs();
    $(".tooltipped").tooltip();

    const clip = new Clipboard("canvas", true);

    $("#file").change(function (ev) {
        const files = (<HTMLInputElement>$("#file").get(0)).files;
        if (files !== null && files.length > 0) {
            const reader = new FileReader();
            reader.onloadend = function () {
                const img = document.createElement("img");
                img.onload = () => {
                    const c = document.getElementById("canvas") as HTMLCanvasElement;
                    const ctx = c.getContext("2d")!;
                    c.width = img.naturalWidth;
                    c.height = img.naturalHeight;
                    ctx.drawImage(img, 0, 0);
                };
                img.onerror = () => {
                    alert("Unable to load image");
                }
                img.src = <string>reader.result;
            }
            reader.readAsDataURL(files[0]);
        }
    });

    loadExample("imgSmall");

    $("#btnProcess").click(async function () {
        try {
            await process();
        } catch (err) {
            alert("Error: " + err);
        }
    });

    $("#chkShowLabels, #chkFillFacets, #chkShowBorders, #txtSizeMultiplier, #txtLabelFontSize, #txtLabelFontColor").change(async () => {
        await updateOutput();
    });

    $("#btnDownloadSVG").click(function () {
        downloadSVG();
    });

    $("#btnDownloadPNG").click(function () {
        downloadPNG();
    });

    $("#btnDownloadPalettePNG").click(function () {
        downloadPalettePng();
    });

    // Toggle between fit-to-view and detail view
    $("#btnToggleView").click(function () {
        const container = $("#svgContainer");
        const button = $("#btnToggleView");

        if (container.hasClass("svg-fit-view")) {
            // Switch to detail view
            container.removeClass("svg-fit-view").addClass("svg-detail-view");
            button.html('<i class="material-icons left">fit_screen</i>Switch to Fit View');
        } else {
            // Switch to fit view
            container.removeClass("svg-detail-view").addClass("svg-fit-view");
            button.html('<i class="material-icons left">zoom_out_map</i>Switch to Detail View');
        }
    });

    $("#lnkTrivial").click(() => { loadExample("imgTrivial"); return false; });
    $("#lnkSmall").click(() => { loadExample("imgSmall"); return false; });
    $("#lnkMedium").click(() => { loadExample("imgMedium"); return false; });
});
