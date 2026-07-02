import os
import subprocess
import tempfile


def merge_wav_files_with_crossfade(
    audio_files: list[str],
    output_path: str,
    crossfade_duration: float = 0.12,
) -> None:
    if not audio_files:
        raise ValueError("No audio files to merge")

    if len(audio_files) == 1:
        source = audio_files[0]
        if os.path.abspath(source) != os.path.abspath(output_path):
            with open(source, "rb") as src, open(output_path, "wb") as dst:
                dst.write(src.read())
        return

    with tempfile.TemporaryDirectory() as temp_dir:
        normalized_files: list[str] = []
        for index, audio_file in enumerate(audio_files):
            normalized_path = os.path.join(temp_dir, f"norm_{index}.wav")
            command = [
                "ffmpeg",
                "-y",
                "-i",
                audio_file,
                "-ar",
                "48000",
                "-ac",
                "2",
                "-c:a",
                "pcm_s16le",
                normalized_path,
            ]
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode != 0:
                stderr_text = result.stderr.decode("utf-8", errors="replace")
                raise RuntimeError(f"FFmpeg normalization failed for {audio_file}: {stderr_text}")
            normalized_files.append(normalized_path)

        filter_parts: list[str] = []
        last_label = "0:a"
        for index in range(1, len(normalized_files)):
            next_label = f"{index}:a"
            output_label = f"a{index}"
            filter_parts.append(
                f"[{last_label}][{next_label}]acrossfade=d={crossfade_duration}:c1=tri:c2=tri[{output_label}]"
            )
            last_label = output_label

        command = ["ffmpeg", "-y"]
        for normalized_path in normalized_files:
            command.extend(["-i", normalized_path])
        command.extend(
            [
                "-filter_complex",
                ";".join(filter_parts),
                "-map",
                f"[{last_label}]",
                "-c:a",
                "pcm_s16le",
                output_path,
            ]
        )
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode != 0:
            stderr_text = result.stderr.decode("utf-8", errors="replace")
            raise RuntimeError(f"FFmpeg crossfade merge failed: {stderr_text}")
