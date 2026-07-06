import os
import subprocess

def convert_wav_to_mp3_ffmpeg(wav_path: str, mp3_path: str) -> bool:
    """
    Chuyển đổi file wav sang mp3 bằng ffmpeg.
    Trả về True nếu thành công, False nếu thất bại.
    """
    command = [
        "ffmpeg",
        "-y",
        "-i", wav_path,
        "-codec:a", "libmp3lame",
        "-qscale:a", "2",
        mp3_path
    ]
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return result.returncode == 0
    except Exception as e:
        print(f"Error converting wav to mp3: {e}")
        return False
