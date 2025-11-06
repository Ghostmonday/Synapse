// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SinapseiOS",
    platforms: [
        .iOS(.v17),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "SinapseiOS",
            targets: ["SinapseiOS"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "SinapseiOS",
            dependencies: [],
            path: ".",
            sources: [
                "SinapseApp.swift",
                "Models",
                "ViewModels",
                "Views",
                "Services",
                "Managers",
                "Components",
                "Extensions"
            ]
        ),
    ]
)

