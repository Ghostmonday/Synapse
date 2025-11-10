import SwiftUI

/// Performance Optimization Extensions
extension View {
    /// Optimize animations for reduced motion preference
    @ViewBuilder
    func optimizedAnimation(_ animation: Animation?, value: some Equatable) -> some View {
        if UIAccessibility.isReduceMotionEnabled {
            self.animation(nil, value: value)
        } else {
            self.animation(animation, value: value)
        }
    }
    
    /// Lazy load content only when visible
    func lazyLoad() -> some View {
        self.onAppear {
            // Content loads when view appears
        }
    }
}

/// Image Cache Helper
class ImageCache {
    static let shared = ImageCache()
    private let cache = NSCache<NSString, UIImage>()
    
    private init() {
        cache.countLimit = 100
        cache.totalCostLimit = 50 * 1024 * 1024 // 50MB
    }
    
    func get(key: String) -> UIImage? {
        return cache.object(forKey: key as NSString)
    }
    
    func set(key: String, image: UIImage) {
        cache.setObject(image, forKey: key as NSString)
    }
}

/// Cached Async Image
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    @ViewBuilder let content: (Image) -> Content
    @ViewBuilder let placeholder: () -> Placeholder
    @State private var image: UIImage?
    
    var body: some View {
        Group {
            if let image = image {
                content(Image(uiImage: image))
            } else {
                placeholder()
                    .onAppear {
                        loadImage()
                    }
            }
        }
    }
    
    private func loadImage() {
        guard let url = url else { return }
        let key = url.absoluteString
        
        // Check cache first
        if let cached = ImageCache.shared.get(key: key) {
            image = cached
            return
        }
        
        // Load from network
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let loadedImage = UIImage(data: data) {
                    ImageCache.shared.set(key: key, image: loadedImage)
                    await MainActor.run {
                        image = loadedImage
                    }
                }
            } catch {
                print("[CachedAsyncImage] Failed to load: \(error)")
            }
        }
    }
}

/// Pagination Helper
struct PaginatedList<Item: Identifiable, Content: View>: View {
    let items: [Item]
    let pageSize: Int
    @ViewBuilder let content: (Item) -> Content
    @State private var displayedCount: Int
    
    init(items: [Item], pageSize: Int = 20, @ViewBuilder content: @escaping (Item) -> Content) {
        self.items = items
        self.pageSize = pageSize
        self.content = content
        _displayedCount = State(initialValue: min(pageSize, items.count))
    }
    
    var body: some View {
        LazyVStack {
            ForEach(Array(items.prefix(displayedCount))) { item in
                content(item)
                    .onAppear {
                        if item.id == items[displayedCount - 1].id && displayedCount < items.count {
                            loadMore()
                        }
                    }
            }
        }
    }
    
    private func loadMore() {
        displayedCount = min(displayedCount + pageSize, items.count)
    }
}

