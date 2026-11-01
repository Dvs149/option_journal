import Foundation

// MARK: - Pine Script Models
public struct PineScriptResponse: Codable, Sendable {
    public let scripts: [PineScript]
    public let stats: PineScriptStats?
}

public struct PineScriptStats: Codable, Sendable {
    public let total: Int
    public let strategies: Int
    public let indicators: Int
    public let libraries: Int
    public let alerts: Int
    public let favorites: Int
    public let categories: [String]?
    public let markets: [String]?
}

public struct PineScript: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let title: String
    public let scriptType: String
    public let version: String?
    public let category: String?
    public let targetMarket: String?
    public let timeframe: String?
    public let description: String?
    public let code: String
    public let tradingviewUrl: String?
    public let isFavorite: Bool?
    public let createdAt: String?
    public let updatedAt: String?

    public init(
        id: Int,
        title: String,
        scriptType: String,
        version: String? = "v5",
        category: String? = "Options",
        targetMarket: String? = "All",
        timeframe: String? = "5m",
        description: String? = nil,
        code: String,
        tradingviewUrl: String? = nil,
        isFavorite: Bool? = false,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.title = title
        self.scriptType = scriptType
        self.version = version
        self.category = category
        self.targetMarket = targetMarket
        self.timeframe = timeframe
        self.description = description
        self.code = code
        self.tradingviewUrl = tradingviewUrl
        self.isFavorite = isFavorite
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct CreatePineScriptRequest: Codable, Sendable {
    public let title: String
    public let scriptType: String
    public let version: String?
    public let category: String?
    public let targetMarket: String?
    public let timeframe: String?
    public let description: String?
    public let code: String
    public let tradingviewUrl: String?
    public let isFavorite: Bool?
    
    public init(
        title: String,
        scriptType: String,
        version: String? = "v5",
        category: String? = "Options",
        targetMarket: String? = "All",
        timeframe: String? = "5m",
        description: String? = nil,
        code: String,
        tradingviewUrl: String? = nil,
        isFavorite: Bool? = false
    ) {
        self.title = title
        self.scriptType = scriptType
        self.version = version
        self.category = category
        self.targetMarket = targetMarket
        self.timeframe = timeframe
        self.description = description
        self.code = code
        self.tradingviewUrl = tradingviewUrl
        self.isFavorite = isFavorite
    }
}
