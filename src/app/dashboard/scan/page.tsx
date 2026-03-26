'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, FileText, Check, X } from 'lucide-react'

interface OCRResult {
  vendor_name: string
  vendor_nip?: string
  date: string
  total_amount: number
  suggested_category: string
  items: Array<{ name: string; price: number }>
  confidence: number
}

export default function ScanPage() {
  const [step, setStep] = useState<'capture' | 'preview' | 'result'>('capture')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (err) {
      alert('Nie można uzyskać dostępu do kamery')
      console.error(err)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      setCameraActive(false)
    }
  }

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        const imageData = canvasRef.current.toDataURL('image/jpeg')
        setImageSrc(imageData)
        setStep('preview')
        stopCamera()
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string)
        setStep('preview')
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeImage = async () => {
    if (!imageSrc) return

    setLoading(true)
    try {
      const formData = new FormData()
      const blob = await fetch(imageSrc).then((r) => r.blob())
      formData.append('file', blob)

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      setOcrResult(data)
      setStep('result')
    } catch (err) {
      alert('Błąd podczas analizy obrazu')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!ocrResult) return

    setLoading(true)
    try {
      // TODO: Save transaction to Supabase
      alert('Transakcja została zatwierdzona i zapisana')
      setStep('capture')
      setImageSrc(null)
      setOcrResult(null)
    } catch (err) {
      alert('Błąd podczas zapisywania transakcji')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-8">
      {step === 'capture' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#ededed] mb-2">Skanuj paragon</h1>
            <p className="text-[#999]">
              Zrób zdjęcie paragon lub faktury, a my automatycznie rozpoznamy dane
            </p>
          </div>

          {/* Camera Preview */}
          <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden">
            {cameraActive ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-video bg-black"
                />
                <div className="absolute inset-0 border-2 border-[#6c5ce7] opacity-50 pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-[#6c5ce7]" />
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-[#1e1e24] flex items-center justify-center">
                <Camera className="w-16 h-16 text-[#2a2a35]" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold py-3 rounded-lg transition"
              >
                <Camera className="w-5 h-5" />
                <span>Zrób zdjęcie</span>
              </button>
            ) : (
              <button
                onClick={takePhoto}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#00b894] to-[#55efc4] hover:opacity-90 text-white font-semibold py-3 rounded-lg transition"
              >
                <Camera className="w-5 h-5" />
                <span>Uchwycz obraz</span>
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center space-x-2 bg-[#1e1e24] hover:bg-[#2a2a35] text-[#ededed] font-semibold py-3 rounded-lg border border-[#2a2a35] transition"
            >
              <Upload className="w-5 h-5" />
              <span>Wybierz z galerii</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center space-x-2 bg-[#1e1e24] hover:bg-[#2a2a35] text-[#ededed] font-semibold py-3 rounded-lg border border-[#2a2a35] transition"
            >
              <FileText className="w-5 h-5" />
              <span>Importuj PDF</span>
            </button>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {step === 'preview' && imageSrc && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#ededed] mb-2">
              Podgląd obrazu
            </h1>
            <p className="text-[#999]">Zweryfikuj obraz przed analizą</p>
          </div>

          <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden">
            <img
              src={imageSrc}
              alt="Preview"
              className="w-full max-h-96 object-contain bg-[#1e1e24]"
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={analyzeImage}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Analizowanie...' : 'Analizuj'}
            </button>
            <button
              onClick={() => {
                setStep('capture')
                setImageSrc(null)
              }}
              className="flex-1 flex items-center justify-center space-x-2 bg-[#1e1e24] hover:bg-[#2a2a35] text-[#ededed] font-semibold py-3 rounded-lg border border-[#2a2a35] transition"
            >
              <X className="w-5 h-5" />
              <span>Anuluj</span>
            </button>
          </div>
        </div>
      )}

      {step === 'result' && ocrResult && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#ededed] mb-2">
              Rozpoznane dane
            </h1>
            <p className="text-[#999]">
              Pewność: {(ocrResult.confidence * 100).toFixed(0)}%
            </p>
          </div>

          <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Sprzedawca
              </label>
              <input
                type="text"
                defaultValue={ocrResult.vendor_name}
                className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#ededed] mb-2">
                  Data
                </label>
                <input
                  type="date"
                  defaultValue={ocrResult.date}
                  className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#ededed] mb-2">
                  Kwota
                </label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={ocrResult.total_amount}
                  className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#edede d] mb-2">
                Kategoria
              </label>
              <select className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]">
                <option>{ocrResult.suggested_category}</option>
                <option>Jedzenie</option>
                <option>Transport</option>
                <option>Mieszkanie</option>
              </select>
            </div>

            {ocrResult.items.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#ededed] mb-2">
                  Towary ({ocrResult.items.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {ocrResult.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-[#1e1e24] rounded"
                    >
                      <span className="text-sm text-[#999]">{item.name}</span>
                      <span className="text-sm font-semibold text-[#ededed]">
                        {item.price} zł
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-[#00b894] to-[#55efc4] hover:opacity-90 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              <span>Zatwierdź</span>
            </button>
            <button
              onClick={() => {
                setStep('capture')
                setImageSrc(null)
                setOcrResult(null)
              }}
              className="flex-1 flex items-center justify-center space-x-2 bg-[#1e1e24] hover:bg-[#2a2a35] text-[#ededed] font-semibold py-3 rounded-lg border border-[#2a2a35] transition"
            >
              <X className="w-5 h-5" />
              <span>Anuluj</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
