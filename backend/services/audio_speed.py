import subprocess
import shutil

def adjust_audio_speed_ffmpeg(input_path: str, output_path: str, speed: float) -> bool:
    """SÃ¡Â»Â­ dÃ¡Â»Â¥ng FFmpeg Ã„â€˜Ã¡Â»Æ’ thay Ã„â€˜Ã¡Â»â€¢i tÃ¡Â»â€˜c Ã„â€˜Ã¡Â»â„¢ audio. TrÃ¡ÂºÂ£ vÃ¡Â»Â True nÃ¡ÂºÂ¿u thÃƒÂ nh cÃƒÂ´ng."""
    if speed == 1.0:
        if input_path != output_path:
            shutil.copy2(input_path, output_path)
        return True
    
    try:
        # filter atempo limits: 0.5 to 100.0. For <0.5, we would need to chain it.
        # But we only support 0.5 to 2.0 anyway.
        cmd = [
            "ffmpeg", "-y", 
            "-i", input_path, 
            "-filter:a", f"atempo={speed}", 
            output_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            return True
        else:
            print(f"FFmpeg Error: {res.stderr.decode('utf-8', errors='replace')}")
            return False
    except Exception as e:
        print(f"FFmpeg Exception: {e}")
        return False
