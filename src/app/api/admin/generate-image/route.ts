import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const body = await req.json()
    const { prompt, product_name } = body

    if (!prompt && !product_name) {
      return NextResponse.json({ error: 'Se requiere un prompt o nombre de producto' }, { status: 400 })
    }

    const apiKey = process.env.embeddings_openrouter || process.env.LLM_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No se encontró API Key de OpenRouter configurada en el servidor' }, { status: 500 })
    }

    const enhancedPrompt = prompt || `Studio product photography of ${product_name}, clean dark background, arcade gaming aesthetic, sharp focus, professional commercial lighting, 8k resolution, photorealistic`

    // Call OpenRouter Image Generation endpoint (e.g. FLUX or SDXL)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fabricadearcades.com',
        'X-Title': 'Fabrica de Arcades Image Generator',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/flux-1-schnell',
        messages: [
          {
            role: 'user',
            content: enhancedPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter image gen error:', errText)
      return NextResponse.json({ error: `Error en OpenRouter: ${response.status} ${response.statusText}` }, { status: 502 })
    }

    const resData = await response.json()
    const choice = resData.choices?.[0]?.message?.content

    // Flux or DALL-E / SD on OpenRouter can return image URL or markdown
    let imageUrl = ''
    if (typeof choice === 'string') {
      const match = choice.match(/https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|webp)/i) || choice.match(/https?:\/\/[^\s\)]+/i)
      imageUrl = match ? match[0] : choice
    } else if (resData.images?.[0]?.url) {
      imageUrl = resData.images[0].url
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'No se pudo extraer la URL de la imagen generada' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
    })
  } catch (err: any) {
    console.error('Error generating image:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
