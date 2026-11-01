import Foundation

public enum NetworkError: LocalizedError, Sendable {
    case invalidURL(String)
    case unauthorized
    case validationFailed(message: String, fieldErrors: [String: [String]])
    case serverError(statusCode: Int, message: String)
    case decodingFailed(String)
    case connectionFailed(String)
    case emptyResponse
    case unknown(String)
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL(let url):
            return "Invalid request URL: \(url)"
        case .unauthorized:
            return "Session expired or invalid credentials. Please log in again."
        case .validationFailed(let message, let fieldErrors):
            if !fieldErrors.isEmpty {
                let details = fieldErrors.map { "\($0.key): \($0.value.joined(separator: ", "))" }.joined(separator: "\n")
                return "\(message)\n\(details)"
            }
            return message
        case .serverError(let statusCode, let message):
            return "Server Error (\(statusCode)): \(message)"
        case .decodingFailed(let reason):
            return "Failed to parse server response: \(reason)"
        case .connectionFailed(let message):
            return "Network connection failed. Ensure local Laravel server is running on http://127.0.0.1:8000. (\(message))"
        case .emptyResponse:
            return "Server returned an empty response."
        case .unknown(let message):
            return "An unexpected error occurred: \(message)"
        }
    }
}

public struct ValidationErrorResponse: Codable, Sendable {
    public let message: String
    public let errors: [String: [String]]?
}

public struct GenericErrorResponse: Codable, Sendable {
    public let message: String?
    public let error: String?
}
