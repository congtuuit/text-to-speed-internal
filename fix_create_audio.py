import sys

with open('frontend/src/pages/CreateAudio.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import PageHeader from '../components/PageHeader'",
    "import PageHeader from '../components/PageHeader'\nimport Button from '../components/Button'"
)

content = content.replace(
    '''<button className="btn btn-giant" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? t('common.processing') : t('create.generate')}
          </button>''',
    '''<Button className="btn btn-giant" onClick={onGenerate} isLoading={isGenerating}>
            {isGenerating ? t('common.processing') : t('create.generate')}
          </Button>'''
)

content = content.replace(
    '''disabled={dialogPreviewId === sv.id}
                          title={t("voices.preview")}
                        >
                          {dialogPreviewId === sv.id ? "⏳" : "▶"}
                        </button>''',
    '''isLoading={dialogPreviewId === sv.id}
                          title={t("voices.preview")}
                        >
                          {dialogPreviewId === sv.id ? "" : "▶"}
                        </Button>'''
)

content = content.replace(
    '''<button
                          className="btn ghost btn-sm"
                          onClick={async (e) => { e.stopPropagation(); setDialogPreviewId(sv.id); setDialogPreviewUrl(null); try { const url = await onPreview(sv.voice_type, null, Number(speed), sv.seed); setDialogPreviewUrl(url); } catch (err) { Swal.fire({ icon: "error", title: t("common.error"), text: err.message, background: "#1e293b", color: "#fff" }); } finally { setDialogPreviewId(null); } }}
                          isLoading={dialogPreviewId === sv.id}''',
    '''<Button
                          className="btn ghost btn-sm"
                          onClick={async (e) => { e.stopPropagation(); setDialogPreviewId(sv.id); setDialogPreviewUrl(null); try { const url = await onPreview(sv.voice_type, null, Number(speed), sv.seed); setDialogPreviewUrl(url); } catch (err) { Swal.fire({ icon: "error", title: t("common.error"), text: err.message, background: "#1e293b", color: "#fff" }); } finally { setDialogPreviewId(null); } }}
                          isLoading={dialogPreviewId === sv.id}'''
)

with open('frontend/src/pages/CreateAudio.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
