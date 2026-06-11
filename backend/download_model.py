import os

# Set environment variables to local folder
project_root = os.path.dirname(os.path.abspath(__file__))
os.environ["HF_HOME"] = os.path.join(project_root, ".models_cache", "huggingface")
os.environ["TORCH_HOME"] = os.path.join(project_root, ".models_cache", "torch")

print("Downloading model to: " + os.path.join(project_root, ".models_cache"))
print("Please wait... this may take a few minutes as the model is large.")

# Initializing Vieneu triggers the model download
from vieneu import Vieneu
tts = Vieneu()

print("========================================")
print("Download completed!")
print("========================================")
