# Optional local transcription

Local OpenAI Whisper is the default optional ASR helper. It is not a content
runtime, editor, rendering fallback or requirement for graphs. Keep source
media and transcripts at the actual work owner and out of Git when private or
large. Credentials never belong in the package or output records.

Use a separately installed Python environment with FFmpeg available. When
setup is authorized, use native tools directly, with an explicit external venv:

```sh
python3 -m venv /absolute/tools/content-whisper
/absolute/tools/content-whisper/bin/python -m pip install -r "$CONTENT_SKILL/assets/local-transcription.txt"
```

On Windows, use that venv’s `Scripts\python.exe` for pip and the same script
arguments. This optional requirements file retains `openai-whisper` and `pillow`;
no installer, auto hook or environment is bundled. Inspect applicable native
installation guidance when needed. The helper itself uses Python 3.10+.

```sh
/absolute/tools/content-whisper/bin/python "$CONTENT_SKILL/scripts/transcribe-local-whisper.py" /absolute/work/content/outcome/sources --recursive --edit-dir /absolute/work/content/outcome/local-whisper --model large --language da
```

Resolve `CONTENT_SKILL` to this installed skill. `--edit-dir` is required and
absolute. `--model-cache-dir` can select an external cache; otherwise
`CONTENT_WHISPER_CACHE_DIR`, legacy `ACS_WHISPER_CACHE_DIR`, or
`<edit-dir>/.cache/whisper` is used, in that order. Package-overlapping paths,
including symlink destinations, are rejected. Temporary extracted audio stays
under the output boundary and is cleaned on completion/failure. No bytecode
cache is written beside skill code. Third-party runtimes stay external too.

JSON retains text, detected language, word start/end times, engine and original
source path. Recursive inputs keep flat transcript filenames for editor-packer compatibility.
Duplicate clip stems, including across subdirectories, fail before transcription;
select distinct output directories or rename the inputs before retrying. `speaker_0` is a
placeholder, not verified diarization. Existing transcripts are reused;
`--force` deliberately replaces them, so inspect source changes before reuse.
The default model remains `large`; `--model`, `--device`, `--fp16` and language
are explicit options. Model loading can download model weights on first use;
no cloud transcription or source upload is performed.

Optional `--pack --packer /absolute/tools/pack_transcripts.py` invokes only the
explicitly selected external transcript packer using the current interpreter
and external edit directory. There is no hardcoded Video Use installation or
silent fallback. Keep that tool and its dependencies outside the package.

Register an actually used transcript in a [graph](graph.md) with exact bytes,
source relationship, provenance and its own review. Raw ASR can mishear names,
numbers and quotations; compare relevant speech before treating it as truth.
Cloud transcription is opt-in only when explicitly requested, for example for
diarization or a chosen Scribe workflow. Use the provider’s native method and
external secret storage; no API key is requested merely because a tool exists.
