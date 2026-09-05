'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { getUploadUrl } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Scissors, ShoppingBag, ArrowRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface SlideData {
    id: string;
    isCustom: boolean;
    desktopUrl: string;
    mobileUrl: string;
    title?: string;
    linkUrl?: string;
}

export default function LandingSlider() {
    const [slides, setSlides] = useState<SlideData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [shopName, setShopName] = useState('KTown Aari Works');
    const instanceId = useRef(Math.random().toString(36).substr(2, 9));

    // Embla Integration
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
        Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
    ]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    const scrollTo = useCallback((index: number) => {
        if (emblaApi) emblaApi.scrollTo(index);
    }, [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
            emblaApi.off('reInit', onSelect);
        };
    }, [emblaApi, onSelect]);

    useEffect(() => {
        const fetchSlides = async () => {
            try {
                // Fetch branding
                const brandingRes = await apiClient.get('/public/branding');
                if (brandingRes.data?.shopName) setShopName(brandingRes.data.shopName);

                const bannersRes = await apiClient.get('/public/banners');

                const customSlides = (bannersRes.data || [])
                    .filter((b: any) => b.isActive !== false)
                    .map((b: any) => {
                        const hasDesktop = b.imageUrl && b.imageUrl !== 'undefined' && b.imageUrl !== 'null' && b.imageUrl !== '';
                        const hasMobile = b.mobileImageUrl && b.mobileImageUrl !== 'undefined' && b.mobileImageUrl !== 'null' && b.mobileImageUrl !== '';

                        // Robust fallback: if one is missing, use the other
                        const desktopPath = hasDesktop ? b.imageUrl : (hasMobile ? b.mobileImageUrl : '');
                        const mobilePath = hasMobile ? b.mobileImageUrl : (hasDesktop ? b.imageUrl : '');

                        return {
                            id: b.id,
                            isCustom: true,
                            desktopUrl: getUploadUrl(desktopPath),
                            mobileUrl: getUploadUrl(mobilePath),
                            title: b.title,
                            linkUrl: b.linkUrl,
                        };
                    });

                const slidesRes = await apiClient.get('/public/landing-slides');
                const fallbackSlides = (slidesRes.data.urls || []).map((url: string, index: number) => ({
                    id: `fallback-${index}`,
                    isCustom: false,
                    desktopUrl: getUploadUrl(url),
                    mobileUrl: getUploadUrl(url),
                }));

                const allSlides = [...customSlides, ...fallbackSlides];
                setSlides(allSlides);
            } catch (error) {
                console.error(`[LandingSlider-${instanceId.current}] Fetch Error:`, error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSlides();
    }, []);

    // Loading state: use a branded gradient to avoid the "gray flash"
    if (isLoading) {
        return (
            <div className="relative w-full h-[300px] sm:h-[320px] md:h-[450px] lg:h-[550px] overflow-hidden bg-gradient-to-br from-pink-50 to-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
                </div>
                {/* Decorative skeleton circles */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-pink-100/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-pink-200/20 rounded-full blur-3xl" />
            </div>
        );
    }

    // No slides — show a beautiful branded placeholder
    if (slides.length === 0) {
        return (
            <div className="relative w-full h-[300px] sm:h-[320px] md:h-[450px] lg:h-[550px] overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-600 via-rose-500 to-pink-800" />
                {/* Decorative circles */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-pink-300/20 rounded-full blur-2xl" />
                <div className="absolute top-1/4 left-1/3 w-40 h-40 bg-rose-300/20 rounded-full blur-xl" />

                {/* Content overlay */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-6 pt-2">
                    <div className="flex items-center gap-3 mb-2 opacity-90 scale-75 sm:scale-100">
                        <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm">
                            <Scissors className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm">
                            <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                    </div>
                    <h2 className="text-lg sm:text-2xl md:text-4xl font-extrabold mb-3 tracking-tight drop-shadow-lg px-2 leading-snug">
                        Craft Your Style<br className="sm:hidden" />
                        <span className="text-pink-200 block sm:inline sm:ml-2">{shopName}</span>
                    </h2>
                    <p className="text-sm sm:text-lg text-white/85 max-w-xl mb-4 sm:mb-8 leading-relaxed px-4 line-clamp-1 sm:line-clamp-none">
                        Premium tailoring & exclusive fashion — explore our collections
                    </p>
                    <div className="flex gap-4 flex-wrap justify-center">
                        <a
                            href="/shop"
                            className="px-5 py-2 sm:px-7 sm:py-3 bg-white text-pink-700 rounded-full font-bold text-xs sm:text-sm hover:bg-pink-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group"
                        >
                            Shop Collection
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[300px] sm:h-[320px] md:h-[450px] lg:h-[550px] overflow-hidden bg-gray-900 group">
            {/* Embla Viewport */}
            <div className="overflow-hidden h-full" ref={emblaRef}>
                <div className="flex h-full touch-pan-y">
                    {/* Slides */}
                    {slides.map((slide, index) => {
                        const slideContent = (
                            <>
                                {/* Desktop Image */}
                                {slide.desktopUrl && (
                                    <img
                                        src={slide.desktopUrl}
                                        alt={slide.title || `Banner ${index + 1}`}
                                        className="hidden md:block w-full h-full object-cover"
                                        onError={(e) => console.error(`Banner Load Error (Desktop): ${slide.desktopUrl}`, e)}
                                    />
                                )}
                                {/* Mobile Image */}
                                {slide.mobileUrl && (
                                    <img
                                        src={slide.mobileUrl}
                                        alt={slide.title || `Banner ${index + 1}`}
                                        className="block md:hidden w-full h-full object-cover"
                                        onError={(e) => console.error(`Banner Load Error (Mobile): ${slide.mobileUrl}`, e)}
                                    />
                                )}

                                {/* Only show gradients and CTA overlay if it's NOT a custom banner (to avoid covering upload design) */}
                                {!slide.isCustom && (
                                    <>
                                        {/* Gradient overlay for text readability */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                                        {/* CTA Overlay */}
                                        <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 sm:px-16 md:px-24 pointer-events-none">
                                            <p className="text-pink-300 text-[10px] sm:text-xs font-semibold tracking-widest uppercase mb-1 sm:mb-2 opacity-90">
                                                Exclusive Collection
                                            </p>
                                            <h2 className="text-xl sm:text-4xl md:text-5xl font-extrabold text-white mb-2 sm:mb-3 leading-[1.15] drop-shadow-xl max-w-lg">
                                                Craft Your<br className="sm:hidden" />
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-rose-300 ml-0 sm:ml-2">
                                                    Perfect Style
                                                </span>
                                            </h2>
                                            <p className="text-white/80 text-xs sm:text-base mb-5 sm:mb-6 max-w-xs sm:max-w-sm leading-relaxed line-clamp-2 md:line-clamp-none">
                                                Premium tailoring & exclusive fashion for every occasion
                                            </p>
                                            <div className="flex gap-3 flex-wrap pointer-events-auto">
                                                <a
                                                    href="/shop"
                                                    className="px-5 py-2.5 sm:px-7 sm:py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-full font-bold text-xs sm:text-sm transition-all shadow-xl hover:shadow-pink-500/40 flex items-center gap-2 group"
                                                >
                                                    Shop Now
                                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </a>
                                                <a
                                                    href="/shop"
                                                    className="px-5 py-2.5 sm:px-7 sm:py-3 bg-white/10 border border-white/30 text-white rounded-full font-bold text-xs sm:text-sm hover:bg-white/20 transition-all backdrop-blur-sm"
                                                >
                                                    Explore
                                                </a>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        );

                        return (
                            <div key={slide.id || index} className="flex-[0_0_100%] min-w-0 relative h-full">
                                {/* If it's a custom banner with a link, wrap it in an anchor tag */}
                                {slide.isCustom && slide.linkUrl ? (
                                    <a href={slide.linkUrl} className="block w-full h-full relative cursor-pointer z-10">
                                        {slideContent}
                                    </a>
                                ) : (
                                    slideContent
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Left Arrow */}
            {slides.length > 1 && (
                <button
                    onClick={scrollPrev}
                    className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-white/20 hover:border-white/40 hover:scale-110"
                    aria-label="Previous slide"
                >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            )}

            {/* Right Arrow */}
            {slides.length > 1 && (
                <button
                    onClick={scrollNext}
                    className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-white/20 hover:border-white/40 hover:scale-110"
                    aria-label="Next slide"
                >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            )}

            {/* Dots indicator */}
            {slides.length > 1 && (
                <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-30">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => scrollTo(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${index === selectedIndex
                                ? 'bg-pink-400 w-8 shadow-lg shadow-pink-500/50'
                                : 'bg-white/50 hover:bg-white/80 w-2'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Slide counter */}
            {slides.length > 1 && (
                <div className="absolute top-4 right-5 z-30 bg-black/30 backdrop-blur-sm text-white/80 text-xs px-3 py-1 rounded-full border border-white/20">
                    {selectedIndex + 1} / {slides.length}
                </div>
            )}
        </div>
    );
}
