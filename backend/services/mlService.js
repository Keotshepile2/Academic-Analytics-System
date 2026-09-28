const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the ML pipeline folder
const ML_PIPELINE_PATH = path.join(__dirname, '../../ml-pipeline');

// Path to Python in the virtual environment
const PYTHON_CMD = process.platform === 'win32'
    ? path.join(ML_PIPELINE_PATH, 'venv', 'Scripts', 'python.exe')
    : path.join(ML_PIPELINE_PATH, 'venv', 'bin', 'python');

/**
 * Run a Python script and return parsed JSON output.
 */
function runPythonScript(scriptRelativePath) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(ML_PIPELINE_PATH, scriptRelativePath);
        const cmd = `"${PYTHON_CMD}" "${scriptPath}"`;

        console.log(`🐍 Running ML script: ${scriptRelativePath}`);
        console.log(`   Command: ${cmd}`);

        exec(cmd, {
            cwd: ML_PIPELINE_PATH,
            maxBuffer: 20 * 1024 * 1024, // 20 MB buffer
            timeout: 60000 // 60 second timeout
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Python error:', stderr || error.message);
                return reject(new Error(stderr || error.message));
            }

            // Try to find JSON in the output (last line starting with '{')
            try {
                const lines = stdout.trim().split('\n');
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (line.startsWith('{')) {
                        return resolve(JSON.parse(line));
                    }
                }
                resolve({ success: true, output: stdout });
            } catch (e) {
                reject(new Error(`Failed to parse Python JSON output: ${e.message}`));
            }
        });
    });
}

/**
 * Get ML predictions for all students.
 * Runs: ml-pipeline/models/predict.py
 */
async function getPredictions() {
    try {
        const result = await runPythonScript('models/predict.py');
        return result;
    } catch (error) {
        console.error('❌ ML prediction failed:', error.message);
        throw error;
    }
}

/**
 * Get model evaluation metrics.
 * Reads: ml-pipeline/outputs/metrics.json
 */
async function getModelMetrics() {
    try {
        const metricsPath = path.join(ML_PIPELINE_PATH, 'outputs', 'metrics.json');
        if (!fs.existsSync(metricsPath)) {
            throw new Error('Metrics file not found. Run evaluate.py first.');
        }
        const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        return metrics;
    } catch (error) {
        console.error('❌ Metrics load failed:', error.message);
        throw error;
    }
}

/**
 * Get model metadata (feature importance, training info).
 * Reads: ml-pipeline/models/metadata.json
 */
async function getModelMetadata() {
    try {
        const metadataPath = path.join(ML_PIPELINE_PATH, 'models', 'metadata.json');
        if (!fs.existsSync(metadataPath)) {
            throw new Error('Metadata file not found. Run train.py first.');
        }
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        return metadata;
    } catch (error) {
        console.error('❌ Metadata load failed:', error.message);
        throw error;
    }
}

/**
 * Retrain the model by running the full pipeline.
 * Runs: preprocess.py → train.py → evaluate.py
 */
async function retrainModel() {
    try {
        console.log('🔁 Retraining ML model...');
        // Step 1: Extract fresh data
        await runPythonScript('data/extract.py');
        // Step 2: Engineer features
        await runPythonScript('data/preprocess.py');
        // Step 3: Train
        await runPythonScript('models/train.py');
        // Step 4: Evaluate
        await runPythonScript('models/evaluate.py');
        
        return { success: true, message: 'Model retrained successfully' };
    } catch (error) {
        console.error('❌ Retraining failed:', error.message);
        throw error;
    }
}

module.exports = {
    getPredictions,
    getModelMetrics,
    getModelMetadata,
    retrainModel
};