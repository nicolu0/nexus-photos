import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CapturedImage = {
    uri: string;
    createdAt: number;
};

type ImagesContextValue = {
    images: CapturedImage[];
    addImage: (image: CapturedImage) => void;
};

const ImagesContext = createContext<ImagesContextValue | undefined>(undefined);

export function ImagesProvider({ children }: { children: ReactNode }) {
    const [images, setImages] = useState<CapturedImage[]>([]);

    function addImage(image: CapturedImage) {
        setImages((prev) => [image, ...prev]);
    }

    return (
        <ImagesContext.Provider value={{ images, addImage }}>
            {children}
        </ImagesContext.Provider>
    );
}

export function useImages() {
    const ctx = useContext(ImagesContext);
    if (!ctx) {
        throw new Error('useImages must be used within an ImagesProvider');
    }
    return ctx;
}
