cmake_minimum_required(VERSION 3.15)
project(PDFProcessor)
find_package(Python3 REQUIRED COMPONENTS Interpreter)

set(PYTHON_DIST_DIR "${CMAKE_SOURCE_DIR}/python-dist")
set(RESOURCES_DIR "${CMAKE_SOURCE_DIR}/resources")
set(BUILD_DIR "${CMAKE_SOURCE_DIR}/build")

file(MAKE_DIRECTORY ${PYTHON_DIST_DIR})
file(MAKE_DIRECTORY ${RESOURCES_DIR})

if(NOT EXISTS "${RESOURCES_DIR}/poppler")
    message(STATUS "Downloading Poppler...")
    file(DOWNLOAD
        "https://github.com/oschwartz10612/poppler-windows/releases/download/v24.08.0-0/Release-24.08.0-0.zip"
        "${CMAKE_BINARY_DIR}/poppler.zip"
        SHOW_PROGRESS
    )
    
    message(STATUS "Extracting Poppler...")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xzf "${CMAKE_BINARY_DIR}/poppler.zip"
        WORKING_DIRECTORY "${RESOURCES_DIR}/poppler-temp"
    )
    
    file(RENAME 
        "${RESOURCES_DIR}/poppler-temp/poppler-24.08.0/Library/bin"
        "${RESOURCES_DIR}/poppler"
    )
    
    file(REMOVE_RECURSE "${RESOURCES_DIR}/poppler-temp")
    file(REMOVE "${CMAKE_BINARY_DIR}/poppler.zip")
endif()

if(NOT EXISTS "${RESOURCES_DIR}/tesseract")
    message(STATUS "Downloading Tesseract...")
    file(MAKE_DIRECTORY "${RESOURCES_DIR}/tesseract/tessdata")
    
    file(DOWNLOAD
        "https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.5.0.20241111.exe"
        "${CMAKE_BINARY_DIR}/tesseract.exe"
        SHOW_PROGRESS
    )
    
    message(STATUS "Installing Tesseract...")
    execute_process(
        COMMAND "${CMAKE_BINARY_DIR}/tesseract.exe" /S /D=${CMAKE_BINARY_DIR}/tess-extract
        WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    )
    
    file(COPY "${CMAKE_BINARY_DIR}/tess-extract/tesseract.exe" DESTINATION "${RESOURCES_DIR}/tesseract")
    file(GLOB DLL_FILES "${CMAKE_BINARY_DIR}/tess-extract/*.dll")
    file(COPY ${DLL_FILES} DESTINATION "${RESOURCES_DIR}/tesseract")
    file(COPY "${CMAKE_BINARY_DIR}/tess-extract/tessdata/eng.traineddata" DESTINATION "${RESOURCES_DIR}/tesseract/tessdata")
    
    file(DOWNLOAD
        "https://github.com/tesseract-ocr/tessdata_fast/raw/main/ind.traineddata"
        "${RESOURCES_DIR}/tesseract/tessdata/ind.traineddata"
    )
    
    file(REMOVE_RECURSE "${CMAKE_BINARY_DIR}/tess-extract")
    file(REMOVE "${CMAKE_BINARY_DIR}/tesseract.exe")
endif()

if(NOT EXISTS "${RESOURCES_DIR}/ghostscript/bin/gswin64c.exe")
    message(STATUS "Downloading Ghostscript (pre-compiled)...")
    
    file(DOWNLOAD
        "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10060/ghostpdl-10.06.0-windows-x64.zip"
        "${CMAKE_BINARY_DIR}/ghostscript.zip"
        SHOW_PROGRESS
    )
    
    message(STATUS "Extracting Ghostscript...")
    file(MAKE_DIRECTORY "${CMAKE_BINARY_DIR}/gs-extract")
    
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xzf "${CMAKE_BINARY_DIR}/ghostscript.zip"
        WORKING_DIRECTORY "${CMAKE_BINARY_DIR}/gs-extract"
    )
    
    file(GLOB GS_EXTRACTED_DIR "${CMAKE_BINARY_DIR}/gs-extract/*")
    list(GET GS_EXTRACTED_DIR 0 GS_DIR)
    
    if(EXISTS "${GS_DIR}/bin/gswin64c.exe")
        message(STATUS "Copying Ghostscript to resources...")
        file(MAKE_DIRECTORY "${RESOURCES_DIR}/ghostscript")
        file(COPY "${GS_DIR}/bin" DESTINATION "${RESOURCES_DIR}/ghostscript")
        file(COPY "${GS_DIR}/lib" DESTINATION "${RESOURCES_DIR}/ghostscript")
        
        message(STATUS "✓ Ghostscript bundled successfully!")
        
        file(REMOVE_RECURSE "${CMAKE_BINARY_DIR}/gs-extract")
        file(REMOVE "${CMAKE_BINARY_DIR}/ghostscript.zip")
    else()
        message(WARNING "Ghostscript extraction failed - files not found")
        message(STATUS "Searched: ${GS_DIR}/bin/gswin64c.exe")
    endif()
endif()

message(STATUS "Installing PyInstaller...")
execute_process(
    COMMAND ${Python3_EXECUTABLE} -m pip install pyinstaller
    RESULT_VARIABLE PYINSTALLER_RESULT
)

message(STATUS "Building Python executables...")

execute_process(
    COMMAND ${Python3_EXECUTABLE} -m PyInstaller
        --onefile
        # --clean
        --log-level ERROR
        --distpath ${PYTHON_DIST_DIR}
        --workpath ${BUILD_DIR}
        --specpath ${BUILD_DIR}
        --name ocr_processor
        ${CMAKE_SOURCE_DIR}/python-scripts/ocr_processor.py
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

execute_process(
    COMMAND ${Python3_EXECUTABLE} -m PyInstaller
        --onefile
        # --clean
        --log-level ERROR
        --distpath ${PYTHON_DIST_DIR}
        --workpath ${BUILD_DIR}
        --specpath ${BUILD_DIR}
        --name pdf_editor
        ${CMAKE_SOURCE_DIR}/python-scripts/pdf_editor.py
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

execute_process(
    COMMAND ${Python3_EXECUTABLE} -m PyInstaller
        --onefile
        # --clean
        --log-level ERROR
        --distpath ${PYTHON_DIST_DIR}
        --workpath ${BUILD_DIR}
        --specpath ${BUILD_DIR}
        --name pdf_converter
        ${CMAKE_SOURCE_DIR}/python-scripts/pdf_converter.py
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

execute_process(
    COMMAND ${Python3_EXECUTABLE} -m PyInstaller
        --onefile
        # --clean
        --log-level ERROR
        --distpath ${PYTHON_DIST_DIR}
        --workpath ${BUILD_DIR}
        --specpath ${BUILD_DIR}
        --name pdf_converter
        ${CMAKE_SOURCE_DIR}/python-scripts/pdf_text_editor.py
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

message(STATUS "Bundle setup complete!")
message(STATUS "Python executables: ${PYTHON_DIST_DIR}")
message(STATUS "Poppler binaries: ${RESOURCES_DIR}/poppler")
message(STATUS "Tesseract binaries: ${RESOURCES_DIR}/tesseract")

add_custom_target(bundle ALL
    COMMENT "Building bundle dependencies"
)
