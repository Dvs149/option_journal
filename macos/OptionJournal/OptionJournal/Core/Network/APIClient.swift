import Foundation

public enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
    case patch = "PATCH"
}

public actor APIClient {
    public static let shared = APIClient()
    
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    public init(session: URLSession = .shared) {
        self.session = session
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder = decoder
        
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        self.encoder = encoder
    }
    
    public func request<T: Decodable>(
        endpoint: String,
        method: HTTPMethod = .get,
        body: (any Encodable)? = nil,
        queryParams: [String: String]? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        let url = try buildURL(endpoint: endpoint, queryParams: queryParams)
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = method.rawValue
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if requiresAuth, let token = KeychainManager.shared.getToken() {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            do {
                urlRequest.httpBody = try encoder.encode(body)
            } catch {
                throw NetworkError.unknown("Failed to encode request body: \(error.localizedDescription)")
            }
        }
        
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch let urlError as URLError {
            throw NetworkError.connectionFailed(urlError.localizedDescription)
        } catch {
            throw NetworkError.unknown(error.localizedDescription)
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.unknown("Invalid server response object.")
        }
        
        return try handleResponse(data: data, httpResponse: httpResponse)
    }
    
    public func downloadData(
        endpoint: String,
        queryParams: [String: String]? = nil,
        requiresAuth: Bool = true
    ) async throws -> Data {
        let url = try buildURL(endpoint: endpoint, queryParams: queryParams)
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = HTTPMethod.get.rawValue
        
        if requiresAuth, let token = KeychainManager.shared.getToken() {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch let urlError as URLError {
            throw NetworkError.connectionFailed(urlError.localizedDescription)
        } catch {
            throw NetworkError.unknown(error.localizedDescription)
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.unknown("Invalid server response object.")
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                _ = KeychainManager.shared.deleteToken()
                throw NetworkError.unauthorized
            }
            let rawMsg = String(data: data, encoding: .utf8) ?? "HTTP \(httpResponse.statusCode)"
            throw NetworkError.serverError(statusCode: httpResponse.statusCode, message: rawMsg)
        }
        
        return data
    }
    
    private func buildURL(endpoint: String, queryParams: [String: String]?) throws -> URL {
        let base = APIEndpoints.baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let path = endpoint.hasPrefix("/") ? endpoint : "/\(endpoint)"
        guard var components = URLComponents(string: "\(base)\(path)") else {
            throw NetworkError.invalidURL("\(base)\(path)")
        }
        
        if let params = queryParams, !params.isEmpty {
            components.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        
        guard let finalURL = components.url else {
            throw NetworkError.invalidURL("\(base)\(path)")
        }
        return finalURL
    }
    
    private func handleResponse<T: Decodable>(data: Data, httpResponse: HTTPURLResponse) throws -> T {
        switch httpResponse.statusCode {
        case 200...299:
            if data.isEmpty, let empty = EmptyResponse() as? T {
                return empty
            }
            do {
                return try decoder.decode(T.self, from: data)
            } catch let decodingError as DecodingError {
                throw NetworkError.decodingFailed(formatDecodingError(decodingError))
            } catch {
                throw NetworkError.decodingFailed(error.localizedDescription)
            }
            
        case 401:
            _ = KeychainManager.shared.deleteToken()
            throw NetworkError.unauthorized
            
        case 422:
            if let valError = try? decoder.decode(ValidationErrorResponse.self, from: data) {
                throw NetworkError.validationFailed(message: valError.message, fieldErrors: valError.errors ?? [:])
            }
            throw NetworkError.validationFailed(message: "Validation failed.", fieldErrors: [:])
            
        default:
            if let genError = try? decoder.decode(GenericErrorResponse.self, from: data), let msg = genError.message ?? genError.error {
                throw NetworkError.serverError(statusCode: httpResponse.statusCode, message: msg)
            }
            let rawMsg = String(data: data, encoding: .utf8) ?? "HTTP \(httpResponse.statusCode)"
            throw NetworkError.serverError(statusCode: httpResponse.statusCode, message: rawMsg)
        }
    }
    
    private func formatDecodingError(_ error: DecodingError) -> String {
        switch error {
        case .typeMismatch(let type, let context):
            return "Type mismatch for \(type) at path \(context.codingPath.map(\.stringValue).joined(separator: "."))."
        case .valueNotFound(let type, let context):
            return "Value \(type) missing at path \(context.codingPath.map(\.stringValue).joined(separator: "."))."
        case .keyNotFound(let key, let context):
            return "Key '\(key.stringValue)' not found at path \(context.codingPath.map(\.stringValue).joined(separator: "."))."
        case .dataCorrupted(let context):
            return "Data corrupted at path \(context.codingPath.map(\.stringValue).joined(separator: "."))."
        @unknown default:
            return error.localizedDescription
        }
    }
}

public struct EmptyResponse: Decodable, Sendable {
    public init() {}
}
