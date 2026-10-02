cmake_minimum_required(VERSION 3.16)
project(api_analyzer VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Optimization and warning flags for Linux (ALT Linux / GCC / Clang)
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(-Wall -Wextra -Wpedantic -O2 -pthread)
endif()

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/src)

# Core library sources (shared between main CLI and unit test runner)
set(CORE_SOURCES
    src/logger.cpp
    src/lexer.cpp
    src/parser.cpp
    src/analyzer.cpp
    src/recommendations.cpp
    src/json_serializer.cpp
    src/doc_generator.cpp
    src/terminal_ui.cpp
    src/interactive.cpp
)

# Main Executable
add_executable(api_analyzer
    src/main.cpp
    ${CORE_SOURCES}
)

# Link pthreads for std::thread / std::async on Linux
find_package(Threads REQUIRED)
target_link_libraries(api_analyzer PRIVATE Threads::Threads stdc++fs)

# Test Executable (Standalone, zero external dependencies)
add_executable(api_analyzer_tests
    tests/test_runner.cpp
    ${CORE_SOURCES}
)
target_link_libraries(api_analyzer_tests PRIVATE Threads::Threads stdc++fs)

# Custom target to run tests
enable_testing()
add_test(NAME CoreUnitTests COMMAND api_analyzer_tests)

# User-mode installation rules (installs into ~/.local/bin or custom prefix without root)
install(TARGETS api_analyzer DESTINATION bin)
