const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

async function testFrontend() {
  try {
    console.log("Testing API...");
    const { stdout: apiOutput } = await execAsync(
      "curl -s http://localhost:3001/api/systems"
    );
    console.log("API Response:", apiOutput);

    console.log("\nTesting Frontend...");
    const { stdout: frontendOutput } = await execAsync(
      "curl -s http://localhost:3001/systems"
    );

    if (frontendOutput.includes("animate-spin")) {
      console.log("❌ Frontend is still loading (spinner found)");
    } else if (frontendOutput.includes("Purchase HTV")) {
      console.log("✅ Frontend shows data");
    } else {
      console.log("❓ Frontend status unclear");
    }

    console.log("\nFrontend HTML length:", frontendOutput.length);
    console.log("Contains spinner:", frontendOutput.includes("animate-spin"));
    console.log("Contains data:", frontendOutput.includes("Purchase HTV"));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testFrontend();
