cmake_minimum_required(VERSION 3.16)
project(clearpath_sc_encoder_reader LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT DEFINED ENV{SFND_ROOT})
    message(FATAL_ERROR
        "Set SFND_ROOT to your extracted Teknic Linux_Software directory.\n"
        "Download from https://www.teknic.com/downloads/ (Linux_Software.tar.gz)")
endif()

set(SFND_ROOT "$ENV{SFND_ROOT}")

if(EXISTS "${SFND_ROOT}/pubSysCls")
    set(SFND_INCLUDE_DIR "${SFND_ROOT}/pubSysCls")
elseif(EXISTS "${SFND_ROOT}/sFoundation/pubSysCls")
    set(SFND_INCLUDE_DIR "${SFND_ROOT}/sFoundation/pubSysCls")
else()
    message(FATAL_ERROR "Could not find pubSysCls under SFND_ROOT=${SFND_ROOT}")
endif()

add_executable(read_encoder read_encoder.cpp)
target_include_directories(read_encoder PRIVATE "${SFND_INCLUDE_DIR}")

if(EXISTS "${SFND_ROOT}/lib/Linux/libpubSysCls.a")
    set(SFND_LIB_DIR "${SFND_ROOT}/lib/Linux")
elseif(EXISTS "${SFND_ROOT}/Linux/libpubSysCls.a")
    set(SFND_LIB_DIR "${SFND_ROOT}/Linux")
else()
    message(FATAL_ERROR
        "Could not find libpubSysCls.a under SFND_ROOT.\n"
        "Build the sFoundation library using Teknic's Linux SDK instructions first.")
endif()

target_link_directories(read_encoder PRIVATE "${SFND_LIB_DIR}")
target_link_libraries(read_encoder PRIVATE pubSysCls pthread dl)

install(TARGETS read_encoder RUNTIME DESTINATION bin)
