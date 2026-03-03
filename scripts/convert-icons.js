const sharp = require("sharp");
const toIco = require("to-ico");
const fs = require("fs");
const path = require("path");

const sourceImage = path.join(__dirname, "../build/icons/app.png");
const outputDir = path.join(__dirname, "../build/icons");

const sizes = [16, 24, 32, 48, 64, 128, 256];

async function convertIcons() {
  try {
    console.log("Reading source image...");
    const sourceBuffer = fs.readFileSync(sourceImage);

    console.log("Creating ICO with sizes:", sizes.join(", "));
    const images = [];

    for (const size of sizes) {
      const resized = await sharp(sourceBuffer)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      images.push(resized);
    }

    const icoBuffer = await toIco(images);
    fs.writeFileSync(path.join(outputDir, "app.ico"), icoBuffer);
    console.log("✓ Created app.ico");

    console.log("Creating notification.png (256x256)...");
    await sharp(sourceBuffer)
      .resize(256, 256, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(outputDir, "notification.png"));
    console.log("✓ Created notification.png");

    console.log("\n✓ Icon conversion complete!");
  } catch (err) {
    console.error("Error converting icons:", err.message);
    process.exit(1);
  }
}

convertIcons();
