import { useEffect, useRef, useState } from "react";
import { Camera, Download, Loader2, RotateCcw, Square, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type VideoRecorderUploadProps = {
  onUploaded: (url: string) => void;
  maxSeconds?: number;
};

const MAX_BYTES = 50 * 1024 * 1024;

function formatTime(value: number) {
  const minutes = String(Math.floor(value / 60)).padStart(2, "0");
  const seconds = String(value % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];

  return candidates.find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
}

function getFileExtension(type: string) {
  if (type.includes("mp4")) return "mp4";
  if (type.includes("quicktime")) return "mov";
  return "webm";
}

export function VideoRecorderUpload({ onUploaded, maxSeconds = 180 }: VideoRecorderUploadProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const objectUrlRef = useRef("");
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("Hazır");

  const hasRecorderSupport = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices && window.MediaRecorder);

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearPreviewUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  };

  const reset = () => {
    stopTimer();
    stopStream();
    clearPreviewUrl();
    chunksRef.current = [];
    recorderRef.current = null;
    setRecordedBlob(null);
    setRecording(false);
    setSeconds(0);
    setStatus("Hazır");

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.srcObject = null;
      video.controls = false;
      video.muted = true;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const startTimer = () => {
    stopTimer();
    startedAtRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setSeconds(elapsed);

      if (elapsed >= maxSeconds && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, 250);
  };

  const startRecording = async () => {
    if (!hasRecorderSupport) {
      toast({ title: "Tarayıcı desteklemiyor", description: "Kamera kaydı için modern Chrome, Edge veya Firefox kullan.", variant: "destructive" });
      return;
    }

    reset();
    setStatus("Kamera açılıyor...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const video = videoRef.current;

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });

      recorder.addEventListener("stop", () => {
        stopTimer();
        stopStream();
        setRecording(false);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setRecordedBlob(blob);
        setStatus(blob.size > MAX_BYTES ? "Dosya büyük" : "Kayıt hazır");

        if (video) {
          video.srcObject = null;
          video.src = objectUrl;
          video.muted = false;
          video.controls = true;
          video.play().catch(() => undefined);
        }
      });

      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.controls = false;
        await video.play();
      }

      recorder.start(1000);
      setRecording(true);
      setStatus("Kayıt alınıyor");
      startTimer();
    } catch (error) {
      stopStream();
      setRecording(false);
      setStatus("Kamera açılamadı");
      toast({
        title: "Kamera açılamadı",
        description: error instanceof Error ? error.message : "Tarayıcı kamera veya mikrofon izni vermedi.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const downloadRecording = () => {
    if (!recordedBlob || !objectUrlRef.current) return;

    const anchor = document.createElement("a");
    anchor.href = objectUrlRef.current;
    anchor.download = `site-video-${Date.now()}.${getFileExtension(recordedBlob.type)}`;
    anchor.click();
  };

  const uploadRecording = async () => {
    if (!recordedBlob) return;
    if (recordedBlob.size > MAX_BYTES) {
      toast({ title: "Dosya büyük", description: "Kayıt 50 MB sınırını aşıyor.", variant: "destructive" });
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      toast({ title: "Oturum yok", description: "Yükleme için admin hesabıyla giriş yap.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setStatus("WordPress'e yükleniyor");

    try {
      const extension = getFileExtension(recordedBlob.type);
      const response = await fetch("/api/wp-media-upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": recordedBlob.type || "video/webm",
          "x-file-name": `site-video-${Date.now()}.${extension}`,
        },
        body: recordedBlob,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "WordPress yükleme tamamlanamadı.");
      }

      onUploaded(payload.url);
      setStatus("Yüklendi");
      toast({ title: "Video yüklendi", description: "Video URL alanı güncellendi." });
    } catch (error) {
      setStatus("Yüklenemedi");
      toast({
        title: "Yükleme hatası",
        description: error instanceof Error ? error.message : "WordPress yükleme hatası.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/35 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold">Kameradan çek</div>
          <div className="text-xs text-muted-foreground">{status} · {formatTime(seconds)}</div>
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${recording ? "bg-red-500" : recordedBlob ? "bg-emerald-400" : "bg-muted"}`} />
      </div>

      <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        {!recording && !recordedBlob && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Kamera bekliyor
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={startRecording} disabled={recording || uploading || !hasRecorderSupport}>
          <Camera className="mr-2 h-4 w-4" />
          Başlat
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={stopRecording} disabled={!recording}>
          <Square className="mr-2 h-4 w-4" />
          Durdur
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={reset} disabled={recording || uploading || !recordedBlob}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Tekrar
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={downloadRecording} disabled={recording || uploading || !recordedBlob}>
          <Download className="mr-2 h-4 w-4" />
          İndir
        </Button>
        <Button type="button" size="sm" onClick={uploadRecording} disabled={recording || uploading || !recordedBlob}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          WordPress'e yükle
        </Button>
      </div>
    </div>
  );
}
