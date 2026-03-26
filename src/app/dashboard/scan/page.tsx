'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, FileText, Check, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCategories } from '@/lib/actions/categories'
import { getOrCreateBudget } from '@/lib/actions/budgets'
import { createTransaction } from '@/lib/actions/transactions'
import type { CategoryWithChildren, Category } from '@/types/budget'

interface OCRResult {
  vendor_name: string
  vendor_nip?: string | null
  date: string
  total_amount: number
  suggested_category: string
  items: Array<{ name: string; price: number }>
  confidence: number
  document_id?: string | null
}

export default function ScanPage() {
  const router = useRouter()
  const [step, setStep] = useState<'capture' | 'preview' | 'result'>('capture')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // For saving transaction
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [editedAmount, setEditedAmount] = useState('')
  const [editedDate, setEditedDate] = useState('')
  const [editedVendor, setEditedVendor] = useState('')

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  // Build flat list of expense leaf categories
  const expenseCategories: Category[] = categories
    .filter(c => c.type === 'expense')
    .flatMap(parent => parent.children.length > 0 ? parent.children : [parent as Category])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch {
      setError('Nie mo\u017cna uzyska\u0107 dost\u0119pu do kamery')
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
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.85)
        setImageSrc(imageData)

        // Convert to File
        canvasRef.current.toBlob((blob) => {
          if (blob) setImageFile(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.85)

        setStep('preview')
        stopCamera()
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string)
        setStep('preview')
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeImage = async () => {
    if (!imageFile) return

    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', imageFile)

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'B\u0142\u0105d OCR')
      }

      setOcrResult(data)
      setEditedAmount(String(data.total_amount || ''))
      setEditedDate(data.date || '')
      setEditedVendor(data.vendor_name || '')

      // Try to auto-select category based on suggestion
      if (data.suggested_category) {
        const match = expenseCategories.find(
          c => c.name.toLowerCase().includes(data.suggested_category.toLowerCase())
        )
        if (match) setSelectedCategoryId(match.id)
      }

      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'B\u0142\u0105d podczas analizy obrazu')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!ocrResult || !selectedCategoryId || !editedAmount || !editedDate) {
      setError('Wype\u0142nij wszystkie wymagane pola (kategoria, kwota, data)')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const date = new Date(editedDate)
      const budget = await getOrCreateBudget(date.getFullYear(), date.getMonth() + 1)

      await createTransaction({
        budget_id: budget.id,
        category_id: selectedCategoryId,
        amount: parseFloat(editedAmount),
        date: editedDate,
        description: editedVendor || undefined,
        document_id: ocrResult.document_id || undefined,
      })

      // Navigate to the month view
      router.push(`/dashboard/month/${date.getFullYear()}/${date.getMonth() + 1}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'B\u0142\u0105d podczas zapisywania transakcji')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-8">
      {error && (
        <div className="mb-4 p-3 bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg text-[#ff7675] text-sm">
          {error}
        </div>
      )}

      {step === 'capture' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#ededed] mb-2">Skanuj paragon</h1>
            <p className="text-[#999]">
              Zr\u00f3b zdj\u0119cie paragonu lub faktury, a Claude automatycznie rozpozna dane
            </p>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold py-3 rounded-lg transition"
              >
                <Camera className="w-5 h-5" />
                <span>Zr\u00f3b zdj\u0119cie</span>
              </button>
            ) : (
              <button
                onClick={takePhoto}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#00b894] to-[#55efc4] hover:opacity-90 text-white font-semibold py-3 rounded-lg transition"
              >
                <Camera className="w-5 h-5" />
                <span>Uchwy\u0107 obraz</span>
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
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {step === 'preview' && imageSrc && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#ededed] mb-2">Podgl\u0105d obrazu</h1>
            <p className="text-[#999]">Zweryfikuj obraz przed analiz\u0105</p>
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
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analizowanie...</span>
                </>
              ) : (
                <span>Analizuj z Claude</span>
              )}
            </button>
            <button
              onClick={() => {
                setStep('capture')
                setImageSrc(null)
                setImageFile(null)
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
            <h1 className="text-3xl font-bold text-[#ededed] mb-2">Rozpoznane dane</h1>
            <p className="text-[#999]">
              Pewno\u015b\u0107 rozpoznania: {(ocrResult.confidence * 100).toFixed(0)}%
            </p>
          </div>

          <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#999] mb-1">Sprzedawca</label>
              <input
                type="text"
                value={editedVendor}
                onChange={(e) => setEditedVendor(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
              />
            </div>

            {ocrResult.vendor_nip && (
              <p className="text-xs text-[#666]">NIP: {ocrResult.vendor_nip}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#999] mb-1">Data</label>
                <input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#999] mb-1">Kwota (z\u0142)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#999] mb-1">Kategoria</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
              >
                <option value="">Wybierz kategori\u0119...</option>
                {categories.filter(c => c.type === 'expense').map(parent => (
                  <optgroup key={parent.id} label={parent.name}>
                    {parent.children.map(child => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                    {parent.children.length === 0 && (
                      <option value={parent.id}>{parent.name}</option>
                    )}
                  </optgroup>
                ))}
              </select>
              {ocrResult.suggested_category && (
                <p className="text-xs text-[#6c5ce7] mt-1">
                  Sugestia AI: {ocrResult.suggested_category}
                </p>
              )}
            </div>

            {ocrResult.items && ocrResult.items.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#999] mb-2">
                  Rozpoznane produkty ({ocrResult.items.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {ocrResult.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-[#1e1e24] rounded"
                    >
                      <span className="text-sm text-[#999]">{item.name}</span>
                      <span className="text-sm font-semibold text-[#ededed]">
                        {Number(item.price).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} z\u0142
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
              disabled={loading || !selectedCategoryId}
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-[#00b894] to-[#55efc4] hover:opacity-90 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Zatwierd\u017a i zapisz</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setStep('capture')
                setImageSrc(null)
                setImageFile(null)
                setOcrResult(null)
                setError(null)
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
