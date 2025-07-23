"use client";

import { useState, useRef, type FormEvent, type ChangeEvent, useEffect } from "react";
import Image from "next/image";
import { generateStory, type StoryOutput } from "@/ai/flows/generate-story";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { X, Wand2, Save, Loader2, Volume2, Pause, Sparkles, BookHeart, Maximize, Minimize, VenetianMask, Rocket, Search, Ghost, Compass, Castle, Settings } from "lucide-react";

const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const storyThemes = [
    { name: 'Fantasy', icon: Castle },
    { name: 'Sci-Fi', icon: Rocket },
    { name: 'Mystery', icon: Search },
    { name: 'Adventure', icon: Compass },
    { name: 'Fairy Tale', icon: VenetianMask },
    { name: 'Horror', icon: Ghost },
];

const fontFamilies = [
    { name: 'Sans Serif', class: 'font-body', pdfFont: "'PT Sans', sans-serif" },
    { name: 'Serif', class: 'font-headline', pdfFont: "'Playfair Display', serif" },
    { name: 'Cursive', class: 'font-cursive', pdfFont: "'Sacramento', cursive" },
    { name: 'Dyslexia Friendly', class: 'font-dyslexic', pdfFont: "'Lexend', sans-serif" },
];

const fontSizes = [
    { name: 'Small', class: 'text-sm', pdfSize: '14px' },
    { name: 'Medium', class: 'text-lg', pdfSize: '18px' },
    { name: 'Large', class: 'text-2xl', pdfSize: '24px' },
];

const voices = [
    { id: 'Algenib', name: 'Standard' },
    { id: 'Umbriel', name: 'Calm' },
    { id: 'Rasalgethi', name: 'Warm' },
    { id: 'Zubenelgenubi', name: 'Deep' },
    { id: 'Schedar', name: 'Clear' },
];

export function StoryGenerator() {
  const [images, setImages] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [theme, setTheme] = useState("");
  const [story, setStory] = useState<StoryOutput>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const storyPartRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const isReadingRef = useRef(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<(AudioBuffer | null)[]>([]);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [fontFamily, setFontFamily] = useState(fontFamilies[0].class);
  const [fontSize, setFontSize] = useState(fontSizes[1].class);
  const [voice, setVoice] = useState(voices[0].id);
  const [audioSpeed, setAudioSpeed] = useState(1);

  useEffect(() => {
    isReadingRef.current = isReading;
  }, [isReading]);

  useEffect(() => {
    return () => {
        if (currentSourceRef.current) {
            currentSourceRef.current.stop();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
  }, []);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const dataUris = await Promise.all(files.map(fileToDataUri));
    setImages((prev) => [...prev, ...dataUris]);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleGenerateStory = async (e: FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      toast({
        title: "No images selected",
        description: "Please upload at least one image to weave a story.",
        variant: "destructive",
      });
      return;
    }
    if (!theme) {
        toast({
            title: "No theme selected",
            description: "Please choose a theme for your story.",
            variant: "destructive",
        });
        return;
    }
    if (!details.trim()) {
      toast({
        title: "No details provided",
        description: "Please provide some details for your story.",
        variant: "destructive",
      });
      return;
    }
    
    setIsReading(false);
    if (currentSourceRef.current) {
      currentSourceRef.current.onended = null;
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    audioBuffersRef.current = [];
    setIsAudioReady(false);
    setCurrentParagraphIndex(null);

    setIsLoading(true);
    setStory([]);
    try {
      const result = await generateStory({ images, details, theme });
      setStory(result);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error Generating Story",
        description: "Something went wrong while weaving your story. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveStory = () => {
    if (!pdfContentRef.current || story.length === 0 || isSaving) return;

    setIsSaving(true);
    toast({
        title: "Generating PDF...",
        description: "Your story is being prepared for download.",
    });

    const storyElement = pdfContentRef.current;

    html2canvas(storyElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: storyElement.offsetWidth,
        height: storyElement.offsetHeight,
        windowWidth: storyElement.scrollWidth,
        windowHeight: storyElement.scrollHeight,
    }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvasAspectRatio = canvas.width / canvas.height;
        
        const imgWidth = pdfWidth;
        const imgHeight = imgWidth / canvasAspectRatio;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = position - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save('picturetales-story.pdf');
        
        toast({
            title: "Story Saved!",
            description: "Your PDF has been downloaded.",
        });
    }).catch(err => {
        console.error("Error generating PDF:", err);
        toast({
            variant: "destructive",
            title: "PDF Generation Failed",
            description: "Something went wrong while creating the PDF.",
        });
    }).finally(() => {
        setIsSaving(false);
    });
  };

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const playSequence = (startIndex: number) => {
    if (!audioContextRef.current || startIndex >= audioBuffersRef.current.length) {
        setIsReading(false);
        setCurrentParagraphIndex(null);
        currentSourceRef.current = null;
        return;
    }

    if (currentSourceRef.current) {
        currentSourceRef.current.onended = null;
        try { currentSourceRef.current.stop(); } catch(e) {}
    }
    
    const buffer = audioBuffersRef.current[startIndex];
    if (!buffer) {
        if (isReadingRef.current) {
             playSequence(startIndex + 1);
        }
        return;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.playbackRate.value = audioSpeed;
    
    source.onended = () => {
        if (isReadingRef.current) {
            playSequence(startIndex + 1);
        }
    };
    
    source.start(0);
    setCurrentParagraphIndex(startIndex);
    currentSourceRef.current = source;

    storyPartRefs.current[startIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handleTextToSpeech = async () => {
    if (isReading) {
        setIsReading(false);
        if (currentSourceRef.current) {
            currentSourceRef.current.onended = null;
            try { currentSourceRef.current.stop(); } catch(e) {}
            currentSourceRef.current = null;
        }
        return;
    }

    setIsReading(true);

    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported.", e);
            toast({ title: "Audio Error", description: "Your browser doesn't support audio playback.", variant: "destructive"});
            setIsReading(false);
            return;
        }
    }
    
    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    if (isAudioReady) {
        playSequence(currentParagraphIndex ?? 0);
        return;
    }

    setIsSynthesizing(true);
    setCurrentParagraphIndex(null);
    try {
        const audioPromises = story.map(part => textToSpeech({ text: part.paragraph, voice }));
        const audioResults = await Promise.all(audioPromises);
        
        const decodedBuffers = await Promise.all(audioResults.map(async (result) => {
            if (!result?.media || !audioContextRef.current) return null;
            try {
                const base64Data = result.media.split(',')[1];
                const arrayBuffer = base64ToArrayBuffer(base64Data);
                return await audioContextRef.current.decodeAudioData(arrayBuffer);
            } catch (decodeError) {
                console.error("Failed to decode audio data", decodeError);
                return null;
            }
        }));

        audioBuffersRef.current = decodedBuffers;
        setIsAudioReady(true);

        if (decodedBuffers.filter(b => b).length > 0) {
            playSequence(0);
        } else {
            toast({ title: "Audio Error", description: "Could not generate valid audio for the story.", variant: "destructive" });
            setIsReading(false);
        }

    } catch (err) {
        console.error(err);
        toast({ title: "Error Generating Audio", description: "Failed to prepare audio for the story.", variant: "destructive"});
        setIsReading(false);
    } finally {
        setIsSynthesizing(false);
    }
  };


  return (
    <div className="container mx-auto px-4 pb-12 md:pb-24">
      <div className={cn(
        "grid grid-cols-1 gap-8 items-start",
        !isFullScreen && "lg:grid-cols-2"
      )}>
        <div className={cn("space-y-8", isFullScreen && "hidden")}>
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">1. Add Your Images</CardTitle>
              <CardDescription>Drop in some pictures to spark the magic.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-primary/50 rounded-xl p-8 text-center cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <Sparkles className="mx-auto h-12 w-12 text-primary" />
                <p className="mt-4 font-semibold text-foreground">
                  Click or drag images here
                </p>
              </div>
              {images.length > 0 && (
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((src, index) => (
                    <div key={index} className="relative group aspect-square border rounded-lg p-1 shadow-sm">
                      <Image
                        src={src}
                        alt={`Uploaded image ${index + 1}`}
                        fill
                        className="rounded-md object-cover transition-transform group-hover:scale-105"
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 bg-card border text-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <form onSubmit={handleGenerateStory}>
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">2. Share Your Idea</CardTitle>
                <CardDescription>
                  Choose a theme, then give the AI a hint.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                    <h3 className="text-md font-semibold text-foreground mb-3">Choose a Theme</h3>
                    <div className="flex flex-wrap gap-4">
                        {storyThemes.map((storyTheme) => {
                            const Icon = storyTheme.icon;
                            return (
                                <button
                                    key={storyTheme.name}
                                    type="button"
                                    onClick={() => setTheme(storyTheme.name)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-200",
                                        theme === storyTheme.name 
                                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                                            : "bg-background text-foreground hover:border-primary/50 hover:bg-primary/10"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="font-medium">{storyTheme.name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="grid w-full gap-1.5">
                  <Textarea
                    id="details"
                    placeholder="e.g., A brave squirrel on a quest for the legendary golden acorn..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={5}
                    className="bg-background"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Weaving your story...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Weave My Story
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>

        <div className={cn(!isFullScreen && "lg:sticky top-8")}>
            <Card className="min-h-[60vh] flex flex-col shadow-xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="font-headline text-2xl">Your Magical Story</CardTitle>
                        <CardDescription>The tale born from your imagination.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        {story.length > 0 && !isLoading && (
                            <>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="icon">
                                            <Settings className="h-4 w-4" />
                                            <span className="sr-only">Settings</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80" align="end">
                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <h4 className="font-medium leading-none">Display & Audio Settings</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Adjust the look and sound of your story.
                                                </p>
                                            </div>
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="font-family">Font Family</Label>
                                                    <Select value={fontFamily} onValueChange={setFontFamily}>
                                                        <SelectTrigger id="font-family">
                                                            <SelectValue placeholder="Select a font" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {fontFamilies.map((font) => (
                                                                <SelectItem key={font.name} value={font.class}>
                                                                    {font.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="font-size">Font Size</Label>
                                                    <Select value={fontSize} onValueChange={setFontSize}>
                                                        <SelectTrigger id="font-size">
                                                            <SelectValue placeholder="Select a size" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {fontSizes.map((size) => (
                                                                <SelectItem key={size.name} value={size.class}>
                                                                    {size.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="voice">Voice</Label>
                                                    <Select value={voice} onValueChange={setVoice}>
                                                        <SelectTrigger id="voice">
                                                            <SelectValue placeholder="Select a voice" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {voices.map((v) => (
                                                                <SelectItem key={v.id} value={v.id}>
                                                                    {v.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="speed">Reading Speed ({audioSpeed.toFixed(1)}x)</Label>
                                                    <Slider
                                                        id="speed"
                                                        value={[audioSpeed]}
                                                        onValueChange={(value) => setAudioSpeed(value[0])}
                                                        max={2}
                                                        min={0.5}
                                                        step={0.1}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="icon" onClick={() => setIsFullScreen(prev => !prev)}>
                                    {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                    <span className="sr-only">{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</span>
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleSaveStory} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    <span className="sr-only">Save Story as PDF</span>
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleTextToSpeech} disabled={isSynthesizing}>
                                    {isSynthesizing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isReading ? (
                                        <Pause className="h-4 w-4" />
                                    ) : (
                                        <Volume2 className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">{isReading ? "Pause Story" : "Read Story Aloud"}</span>
                                </Button>
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent className={cn("flex-grow", (isLoading || story.length === 0) ? "flex items-center justify-center" : "p-6")}>
                {isLoading && (
                    <div className="text-center text-muted-foreground animate-pulse">
                        <Wand2 className="mx-auto h-16 w-16 text-primary/80" />
                        <p className="mt-4 text-lg font-semibold">The AI is weaving its magic...</p>
                    </div>
                )}
                {!isLoading && story.length === 0 && (
                    <div className="text-center text-muted-foreground">
                        <BookHeart className="mx-auto h-16 w-16 text-muted-foreground/50" />
                        <p className="mt-4 text-lg">Your wonderful story will appear here.</p>
                    </div>
                )}
                {story.length > 0 && !isLoading && (
                    <div className="h-full w-full overflow-y-auto pr-4 space-y-10">
                        {story.map((part, index) => (
                            <div 
                                key={index} 
                                className="space-y-6"
                                ref={(el) => (storyPartRefs.current[index] = el)}
                            >
                                <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-lg border group">
                                    <Image
                                        src={part.image}
                                        alt={`Illustration for paragraph ${index + 1}`}
                                        fill
                                        className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                                        data-ai-hint="story illustration"
                                    />
                                </div>
                                <p className={cn(
                                    "text-foreground/90 leading-relaxed transition-all duration-300",
                                    fontFamily,
                                    fontSize,
                                    currentParagraphIndex === index && "bg-primary/10 border-l-4 border-primary p-4 rounded-r-lg"
                                )}>
                                    {part.paragraph}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
      </div>
      
      {story.length > 0 && (
        <div className="absolute top-0 -left-[9999px] p-0 m-0" aria-hidden="true">
            <div ref={pdfContentRef} className="bg-white text-black p-12" style={{ width: '800px' }}>
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline" style={{fontFamily: 'Playfair Display, serif'}}>
                        PictureTales Story
                    </h1>
                    {details && (
                        <p className="text-gray-600 mt-2 font-body italic" style={{fontFamily: 'PT Sans, sans-serif'}}>
                            {details}
                        </p>
                    )}
                </div>

                <div className="space-y-10">
                    {(() => {
                        const selectedFont = fontFamilies.find(f => f.class === fontFamily);
                        const selectedSize = fontSizes.find(s => s.class === fontSize);
                        return story.map((part, index) => (
                            <div key={`pdf-${index}`} style={{ pageBreakInside: 'avoid' }}>
                                <div className="mb-6 rounded-xl overflow-hidden shadow-lg border">
                                    <img
                                        src={part.image}
                                        alt={`Illustration for paragraph ${index + 1}`}
                                        className="w-full h-auto object-cover"
                                    />
                                </div>
                                <p className="leading-relaxed" style={{
                                    fontFamily: selectedFont?.pdfFont || "'PT Sans', sans-serif",
                                    fontSize: selectedSize?.pdfSize || '18px',
                                    lineHeight: '1.6',
                                }}>
                                    {part.paragraph}
                                </p>
                            </div>
                        ))
                    })()}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
