import Foundation

// MARK: - Flexible Double Decoder (handles Double, Int, or String "500.00")
@propertyWrapper
public struct FlexibleDouble: Codable, Sendable, Hashable {
    public var wrappedValue: Double?
    
    public init(wrappedValue: Double?) {
        self.wrappedValue = wrappedValue
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            wrappedValue = nil
        } else if let doubleVal = try? container.decode(Double.self) {
            wrappedValue = doubleVal
        } else if let intVal = try? container.decode(Int.self) {
            wrappedValue = Double(intVal)
        } else if let strVal = try? container.decode(String.self) {
            wrappedValue = Double(strVal)
        } else {
            wrappedValue = nil
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(wrappedValue)
    }
}

// MARK: - User Model
public struct User: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let name: String
    public let username: String?
    public let email: String
    public let defaultAccount: TradingAccount?
    public let createdAt: String?
    public let updatedAt: String?
    
    public init(id: Int, name: String, username: String? = nil, email: String, defaultAccount: TradingAccount? = nil, createdAt: String? = nil, updatedAt: String? = nil) {
        self.id = id
        self.name = name
        self.username = username
        self.email = email
        self.defaultAccount = defaultAccount
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Trading Account Model
public struct TradingAccount: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let userId: Int?
    public let accountName: String
    public let brokerName: String?
    @FlexibleDouble public var initialCapital: Double?
    @FlexibleDouble public var dailyProfitTarget: Double?
    @FlexibleDouble public var dailyMaxLoss: Double?
    @FlexibleDouble public var monthlyProfitTarget: Double?
    @FlexibleDouble public var monthlyMaxLoss: Double?
    public let isDefault: Bool?
    
    public init(id: Int, userId: Int? = nil, accountName: String, brokerName: String? = nil, initialCapital: Double? = nil, dailyProfitTarget: Double? = nil, dailyMaxLoss: Double? = nil, monthlyProfitTarget: Double? = nil, monthlyMaxLoss: Double? = nil, isDefault: Bool? = true) {
        self.id = id
        self.userId = userId
        self.accountName = accountName
        self.brokerName = brokerName
        self._initialCapital = FlexibleDouble(wrappedValue: initialCapital)
        self._dailyProfitTarget = FlexibleDouble(wrappedValue: dailyProfitTarget)
        self._dailyMaxLoss = FlexibleDouble(wrappedValue: dailyMaxLoss)
        self._monthlyProfitTarget = FlexibleDouble(wrappedValue: monthlyProfitTarget)
        self._monthlyMaxLoss = FlexibleDouble(wrappedValue: monthlyMaxLoss)
        self.isDefault = isDefault
    }
}

// MARK: - Authentication Responses & Requests
public struct AuthResponse: Codable, Sendable {
    public let message: String?
    public let user: User
    public let token: String
}

public struct UserProfileResponse: Codable, Sendable {
    public let user: User
}

public struct GenericMessageResponse: Codable, Sendable {
    public let message: String
}

public struct LoginRequest: Codable, Sendable {
    public let login: String
    public let password: String
    
    public init(login: String, password: String) {
        self.login = login
        self.password = password
    }
}
